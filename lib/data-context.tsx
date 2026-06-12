import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { api, getToken } from './api';
import {
  Lead, Property, Deal, FollowUp, Activity, LeadStatus,
  PropertyStatusHistory, AIMatch, TeamMember, BlacklistEntry, SavedFilter,
  PropertyFilterCriteria, TeamPermissions,
} from './types';

interface DataContextValue {
  leads: Lead[];
  properties: Property[];
  deals: Deal[];
  followUps: FollowUp[];
  activities: Activity[];
  isLoading: boolean;
  statusHistory: PropertyStatusHistory[];
  aiMatches: AIMatch[];
  teamMembers: TeamMember[];
  blacklist: BlacklistEntry[];
  savedFilters: SavedFilter[];

  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Lead>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;

  addProperty: (property: Omit<Property, 'id' | 'createdAt'>) => Promise<Property>;
  updateProperty: (id: string, updates: Partial<Property>) => Promise<void>;

  addFollowUp: (followUp: Omit<FollowUp, 'id' | 'createdAt'>) => Promise<FollowUp>;
  updateFollowUp: (id: string, updates: Partial<FollowUp>) => Promise<void>;

  addActivity: (activity: Omit<Activity, 'id'>) => Promise<void>;

  getLeadById: (id: string) => Lead | undefined;
  getPropertyById: (id: string) => Property | undefined;
  getActivitiesForLead: (leadId: string) => Activity[];
  getFollowUpsForLead: (leadId: string) => FollowUp[];
  getDealsForLead: (leadId: string) => Deal[];

  todayFollowUps: FollowUp[];
  overdueFollowUps: FollowUp[];
  pipelineCounts: Record<LeadStatus, number>;

  changePropertyStatus: (propertyId: string, newStatus: Property['status'], reason?: string) => Promise<void>;
  getStatusHistoryForProperty: (propertyId: string) => PropertyStatusHistory[];

  getAIMatchesForLead: (leadId: string) => AIMatch[];
  calculateAndSaveMatches: (leadId: string) => Promise<AIMatch[]>;
  updateAIMatchResponse: (matchId: string, response: AIMatch['clientResponse']) => Promise<void>;

  addTeamMember: (member: Omit<TeamMember, 'id' | 'createdAt'>) => Promise<TeamMember>;
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => Promise<void>;
  deleteTeamMember: (id: string) => Promise<void>;
  updateTeamPermissions: (memberId: string, permissions: Partial<TeamPermissions>) => Promise<void>;
  blockTeamMember: (id: string, reason: string) => Promise<void>;
  unblockTeamMember: (id: string) => Promise<void>;

  addToBlacklist: (entry: Omit<BlacklistEntry, 'id' | 'blockedAt'>) => Promise<BlacklistEntry>;
  removeFromBlacklist: (id: string) => Promise<void>;
  isPhoneBlacklisted: (phone: string) => boolean;
  isEmailBlacklisted: (email: string) => boolean;

  saveFilter: (filter: Omit<SavedFilter, 'id' | 'createdAt'>) => Promise<SavedFilter>;
  deleteFilter: (id: string) => Promise<void>;
  getFilteredProperties: (criteria: PropertyFilterCriteria) => Property[];

  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

// ─── Local AI Matching ─────────────────────────────────────────────────────────
function calculateMatchScore(lead: Lead, property: Property): { score: number; reasons: string[]; confidence: AIMatch['confidenceLevel'] } {
  let score = 0;
  const reasons: string[] = [];
  if (lead.budgetMin && lead.budgetMax && property.price) {
    if (property.price >= lead.budgetMin && property.price <= lead.budgetMax) { score += 30; reasons.push('Budget match'); }
    else if (property.price < lead.budgetMin) { score += 15; reasons.push('Below budget'); }
    else if (property.price <= lead.budgetMax * 1.1) { score += 20; reasons.push('Near budget'); }
  }
  if (lead.preferredPropertyType && property.propertyType && lead.preferredPropertyType === property.propertyType) { score += 25; reasons.push('Preferred type'); }
  if (lead.city && property.city && lead.city.toLowerCase() === property.city.toLowerCase()) { score += 20; reasons.push('City match'); }
  if (lead.preferredBedrooms && property.bedrooms) {
    if (property.bedrooms >= lead.preferredBedrooms) { score += 15; reasons.push(`${property.bedrooms} BHK`); }
    else if (property.bedrooms === lead.preferredBedrooms - 1) { score += 8; }
  }
  const amenities = Array.isArray(lead.preferredAmenities) ? lead.preferredAmenities : [];
  const propAmenities = Array.isArray(property.amenities) ? property.amenities : [];
  if (amenities.length > 0 && propAmenities.length > 0) {
    const matched = amenities.filter(a => propAmenities.some(pa => pa.toLowerCase().includes(a.toLowerCase())));
    const s = Math.round((matched.length / amenities.length) * 10);
    score += s;
    if (matched.length > 0) reasons.push(`${matched.length} amenities`);
  }
  const finalScore = Math.min(100, score);
  const confidence: AIMatch['confidenceLevel'] = finalScore >= 70 ? 'high' : finalScore >= 40 ? 'medium' : 'low';
  return { score: finalScore, reasons, confidence };
}

// ─── Map backend data to frontend types ────────────────────────────────────────
function mapLead(l: any): Lead {
  return {
    id: l.id, name: l.name, phone: l.phone, email: l.email,
    status: l.status as LeadStatus, source: l.source,
    budgetMin: l.budgetMin, budgetMax: l.budgetMax,
    propertyInterest: l.propertyInterest, preferredBedrooms: l.preferredBedrooms,
    preferredPropertyType: l.preferredPropertyType,
    preferredAmenities: Array.isArray(l.preferredAmenities) ? l.preferredAmenities : [],
    city: l.city, assignedTo: l.assignedTo, assignedMemberId: l.assignedMemberId,
    notes: l.notes, isBlacklisted: l.isBlacklisted || false,
    createdAt: l.createdAt, updatedAt: l.updatedAt,
  };
}

function mapProperty(p: any): Property {
  return {
    id: p.id, address: p.address, area: p.area, city: p.city,
    propertyType: p.propertyType, bedrooms: p.bedrooms, bathrooms: p.bathrooms,
    carpetArea: p.carpetArea, price: p.price, furnishing: p.furnishing,
    status: p.status as Property['status'],
    amenities: Array.isArray(p.amenities) ? p.amenities : [],
    ownerName: p.ownerName, ownerPhone: p.ownerPhone,
    images: Array.isArray(p.images) ? p.images : [],
    latitude: p.latitude, longitude: p.longitude,
    createdAt: p.createdAt,
  };
}

function mapFollowUp(f: any): FollowUp {
  return {
    id: f.id, leadId: f.leadId, leadName: f.leadName,
    type: f.type, date: f.date, time: f.time, notes: f.notes,
    status: f.status, assignedTo: f.assignedTo, priority: f.priority,
    reminderMinutes: f.reminderMinutes, createdAt: f.createdAt,
  };
}

function mapTeamMember(m: any): TeamMember {
  return {
    id: m.id, name: m.name, phone: m.phone, email: m.email,
    role: m.role, isActive: m.isActive, isBlocked: m.isBlocked || false,
    blockedReason: m.blockedReason, blockedAt: m.blockedAt,
    permissions: m.permissions || {}, createdAt: m.createdAt,
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusHistory, setStatusHistory] = useState<PropertyStatusHistory[]>([]);
  const [aiMatches, setAiMatches] = useState<AIMatch[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      await refreshData();
    } catch (e) {
      console.error('DataProvider load error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const [l, p, d, f, tm, bl, sf] = await Promise.all([
        api<any[]>("GET", "/api/leads"),
        api<any[]>("GET", "/api/properties"),
        api<any[]>("GET", "/api/deals"),
        api<any[]>("GET", "/api/followups"),
        api<any[]>("GET", "/api/team"),
        api<any[]>("GET", "/api/blacklist"),
        api<any[]>("GET", "/api/filters"),
      ]);
      setLeads(l.map(mapLead));
      setProperties(p.map(mapProperty));
      setDeals(d);
      setFollowUps(f.map(mapFollowUp));
      setTeamMembers(tm.map(mapTeamMember));
      setBlacklist(bl.map((b: any) => ({ id: b.id, clientName: b.clientName, phoneNumber: b.phoneNumber, email: b.email, leadId: b.leadId, reason: b.reason, reasonDescription: b.reasonDescription, blockedBy: b.blockedBy, blockedAt: b.blockedAt, isActive: b.isActive })));
      setSavedFilters(sf.map((f: any) => ({ id: f.id, name: f.name, filterType: f.filterType, criteria: f.criteria, createdAt: f.createdAt })));
    } catch (e) {
      console.error('refreshData error:', e);
    }
  }, []);

  const addLead = useCallback(async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> => {
    const result = await api<any>("POST", "/api/leads", lead);
    const newLead = mapLead(result);
    setLeads(prev => [newLead, ...prev]);
    return newLead;
  }, []);

  const updateLead = useCallback(async (id: string, updates: Partial<Lead>) => {
    const result = await api<any>("PUT", `/api/leads/${id}`, updates);
    setLeads(prev => prev.map(l => l.id === id ? mapLead(result) : l));
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    await api("DELETE", `/api/leads/${id}`);
    setLeads(prev => prev.filter(l => l.id !== id));
  }, []);

  const addProperty = useCallback(async (property: Omit<Property, 'id' | 'createdAt'>): Promise<Property> => {
    const result = await api<any>("POST", "/api/properties", property);
    const newProp = mapProperty(result);
    setProperties(prev => [newProp, ...prev]);
    return newProp;
  }, []);

  const updateProperty = useCallback(async (id: string, updates: Partial<Property>) => {
    const result = await api<any>("PUT", `/api/properties/${id}`, updates);
    setProperties(prev => prev.map(p => p.id === id ? mapProperty(result) : p));
  }, []);

  const addFollowUp = useCallback(async (followUp: Omit<FollowUp, 'id' | 'createdAt'>): Promise<FollowUp> => {
    const result = await api<any>("POST", "/api/followups", followUp);
    const newFU = mapFollowUp(result);
    setFollowUps(prev => [newFU, ...prev]);
    return newFU;
  }, []);

  const updateFollowUp = useCallback(async (id: string, updates: Partial<FollowUp>) => {
    const result = await api<any>("PUT", `/api/followups/${id}`, updates);
    setFollowUps(prev => prev.map(f => f.id === id ? mapFollowUp(result) : f));
  }, []);

  const addActivity = useCallback(async (activity: Omit<Activity, 'id'>) => {
    const result = await api<any>("POST", `/api/leads/${activity.leadId}/activities`, activity);
    setActivities(prev => [{ ...result, timestamp: result.timestamp || new Date().toISOString() }, ...prev]);
  }, []);

  const changePropertyStatus = useCallback(async (propertyId: string, newStatus: Property['status'], reason?: string) => {
    const result = await api<{ property: any; history: any }>("PUT", `/api/properties/${propertyId}/status`, { newStatus, reason });
    setProperties(prev => prev.map(p => p.id === propertyId ? mapProperty(result.property) : p));
    if (result.history) {
      const h: PropertyStatusHistory = { id: result.history.id, propertyId, previousStatus: result.history.previousStatus, newStatus, reason: reason || '', changedBy: result.history.changedBy, changedAt: result.history.changedAt };
      setStatusHistory(prev => [h, ...prev]);
    }
  }, []);

  const getStatusHistoryForProperty = useCallback((propertyId: string) => {
    return statusHistory.filter(h => h.propertyId === propertyId);
  }, [statusHistory]);

  const getAIMatchesForLead = useCallback((leadId: string) => {
    return aiMatches.filter(m => m.leadId === leadId);
  }, [aiMatches]);

  const calculateAndSaveMatches = useCallback(async (leadId: string): Promise<AIMatch[]> => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return [];
    const available = properties.filter(p => p.status === 'available');
    const matches: AIMatch[] = available.map(property => {
      const { score, reasons, confidence } = calculateMatchScore(lead, property);
      return { id: `${leadId}-${property.id}`, leadId, propertyId: property.id, matchScore: score, matchReasons: reasons, confidenceLevel: confidence, createdAt: new Date().toISOString() };
    }).filter(m => m.matchScore > 0).sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
    setAiMatches(prev => {
      const filtered = prev.filter(m => m.leadId !== leadId);
      return [...matches, ...filtered];
    });
    return matches;
  }, [leads, properties]);

  const updateAIMatchResponse = useCallback(async (matchId: string, response: AIMatch['clientResponse']) => {
    setAiMatches(prev => prev.map(m => m.id === matchId ? { ...m, clientResponse: response } : m));
  }, []);

  const addTeamMember = useCallback(async (member: Omit<TeamMember, 'id' | 'createdAt'>): Promise<TeamMember> => {
    const result = await api<any>("POST", "/api/team", { ...member, password: "agent123" });
    const newMember = mapTeamMember(result);
    setTeamMembers(prev => [...prev, newMember]);
    return newMember;
  }, []);

  const updateTeamMember = useCallback(async (id: string, updates: Partial<TeamMember>) => {
    const result = await api<any>("PUT", `/api/team/${id}`, updates);
    setTeamMembers(prev => prev.map(m => m.id === id ? mapTeamMember(result) : m));
  }, []);

  const deleteTeamMember = useCallback(async (id: string) => {
    await api("DELETE", `/api/team/${id}`);
    setTeamMembers(prev => prev.filter(m => m.id !== id));
  }, []);

  const updateTeamPermissions = useCallback(async (memberId: string, permissions: Partial<TeamPermissions>) => {
    const member = teamMembers.find(m => m.id === memberId);
    const merged = { ...((member?.permissions as any) || {}), ...permissions };
    const result = await api<any>("PUT", `/api/team/${memberId}/permissions`, { permissions: merged });
    setTeamMembers(prev => prev.map(m => m.id === memberId ? mapTeamMember(result) : m));
  }, [teamMembers]);

  const blockTeamMember = useCallback(async (id: string, reason: string) => {
    const result = await api<any>("POST", `/api/team/${id}/block`, { reason });
    setTeamMembers(prev => prev.map(m => m.id === id ? mapTeamMember(result) : m));
  }, []);

  const unblockTeamMember = useCallback(async (id: string) => {
    const result = await api<any>("POST", `/api/team/${id}/unblock`);
    setTeamMembers(prev => prev.map(m => m.id === id ? mapTeamMember(result) : m));
  }, []);

  const addToBlacklist = useCallback(async (entry: Omit<BlacklistEntry, 'id' | 'blockedAt'>): Promise<BlacklistEntry> => {
    const result = await api<any>("POST", "/api/blacklist", { clientName: entry.clientName, phoneNumber: entry.phoneNumber, email: entry.email, leadId: entry.leadId, reason: entry.reason, reasonDescription: entry.reasonDescription });
    const newEntry: BlacklistEntry = { id: result.id, clientName: result.clientName, phoneNumber: result.phoneNumber, email: result.email, leadId: result.leadId, reason: result.reason, reasonDescription: result.reasonDescription, blockedBy: result.blockedBy, blockedAt: result.blockedAt, isActive: result.isActive };
    setBlacklist(prev => [newEntry, ...prev]);
    if (entry.leadId) setLeads(prev => prev.map(l => l.id === entry.leadId ? { ...l, isBlacklisted: true } : l));
    return newEntry;
  }, []);

  const removeFromBlacklist = useCallback(async (id: string) => {
    const entry = blacklist.find(b => b.id === id);
    await api("POST", `/api/blacklist/${id}/unblock`);
    setBlacklist(prev => prev.filter(b => b.id !== id));
    if (entry?.leadId) setLeads(prev => prev.map(l => l.id === entry.leadId ? { ...l, isBlacklisted: false } : l));
  }, [blacklist]);

  const isPhoneBlacklisted = useCallback((phone: string) => {
    return blacklist.some(b => b.isActive && b.phoneNumber === phone);
  }, [blacklist]);

  const isEmailBlacklisted = useCallback((email: string) => {
    return blacklist.some(b => b.isActive && b.email === email);
  }, [blacklist]);

  const saveFilter = useCallback(async (filter: Omit<SavedFilter, 'id' | 'createdAt'>): Promise<SavedFilter> => {
    const result = await api<any>("POST", "/api/filters", filter);
    const newFilter: SavedFilter = { id: result.id, name: result.name, filterType: result.filterType, criteria: result.criteria, createdAt: result.createdAt };
    setSavedFilters(prev => [newFilter, ...prev]);
    return newFilter;
  }, []);

  const deleteFilter = useCallback(async (id: string) => {
    await api("DELETE", `/api/filters/${id}`);
    setSavedFilters(prev => prev.filter(f => f.id !== id));
  }, []);

  const getFilteredProperties = useCallback((criteria: PropertyFilterCriteria): Property[] => {
    return properties.filter(p => {
      if (criteria.propertyType && p.propertyType !== criteria.propertyType) return false;
      if (criteria.minPrice && p.price < criteria.minPrice) return false;
      if (criteria.maxPrice && p.price > criteria.maxPrice) return false;
      if (criteria.bedrooms && p.bedrooms !== criteria.bedrooms) return false;
      if (criteria.furnishing && p.furnishing !== criteria.furnishing) return false;
      if (criteria.city && !p.city.toLowerCase().includes(criteria.city.toLowerCase())) return false;
      if (criteria.status && p.status !== criteria.status) return false;
      if (criteria.amenities?.length) {
        const hasAll = criteria.amenities.every(a => p.amenities.some(pa => pa.toLowerCase().includes(a.toLowerCase())));
        if (!hasAll) return false;
      }
      return true;
    });
  }, [properties]);

  const getLeadById = useCallback((id: string) => leads.find(l => l.id === id), [leads]);
  const getPropertyById = useCallback((id: string) => properties.find(p => p.id === id), [properties]);
  const getActivitiesForLead = useCallback((leadId: string) => activities.filter(a => a.leadId === leadId), [activities]);
  const getFollowUpsForLead = useCallback((leadId: string) => followUps.filter(f => f.leadId === leadId), [followUps]);
  const getDealsForLead = useCallback((leadId: string) => deals.filter(d => d.leadId === leadId), [deals]);

  const today = new Date().toISOString().split('T')[0];
  const todayFollowUps = useMemo(() => followUps.filter(f => f.date === today && f.status !== 'done'), [followUps, today]);
  const overdueFollowUps = useMemo(() => followUps.filter(f => f.date < today && f.status === 'pending'), [followUps, today]);
  const pipelineCounts = useMemo(() => {
    const counts: Record<LeadStatus, number> = { inquiry: 0, site_visit: 0, negotiation: 0, offer: 0, deal_done: 0, lost: 0 };
    leads.forEach(l => { if (l.status in counts) counts[l.status as LeadStatus]++; });
    return counts;
  }, [leads]);

  const value = useMemo<DataContextValue>(() => ({
    leads, properties, deals, followUps, activities, isLoading,
    statusHistory, aiMatches, teamMembers, blacklist, savedFilters,
    addLead, updateLead, deleteLead, addProperty, updateProperty,
    addFollowUp, updateFollowUp, addActivity, changePropertyStatus,
    getLeadById, getPropertyById, getActivitiesForLead, getFollowUpsForLead, getDealsForLead,
    getStatusHistoryForProperty, getAIMatchesForLead, calculateAndSaveMatches, updateAIMatchResponse,
    todayFollowUps, overdueFollowUps, pipelineCounts,
    addTeamMember, updateTeamMember, deleteTeamMember, updateTeamPermissions,
    blockTeamMember, unblockTeamMember,
    addToBlacklist, removeFromBlacklist, isPhoneBlacklisted, isEmailBlacklisted,
    saveFilter, deleteFilter, getFilteredProperties, refreshData,
  }), [
    leads, properties, deals, followUps, activities, isLoading,
    statusHistory, aiMatches, teamMembers, blacklist, savedFilters,
    todayFollowUps, overdueFollowUps, pipelineCounts,
    addLead, updateLead, deleteLead, addProperty, updateProperty,
    addFollowUp, updateFollowUp, addActivity, changePropertyStatus,
    getLeadById, getPropertyById, getActivitiesForLead, getFollowUpsForLead, getDealsForLead,
    getStatusHistoryForProperty, getAIMatchesForLead, calculateAndSaveMatches, updateAIMatchResponse,
    addTeamMember, updateTeamMember, deleteTeamMember, updateTeamPermissions,
    blockTeamMember, unblockTeamMember,
    addToBlacklist, removeFromBlacklist, isPhoneBlacklisted, isEmailBlacklisted,
    saveFilter, deleteFilter, getFilteredProperties, refreshData,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
