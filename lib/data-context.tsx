import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Lead, Property, Deal, FollowUp, Activity, UserProfile, LeadStatus,
  PropertyStatusHistory, AIMatch, TeamMember, BlacklistEntry, SavedFilter,
  PropertyFilterCriteria, ROLE_PERMISSIONS, TeamPermissions,
} from './types';
import { seedLeads, seedProperties, seedDeals, seedFollowUps, seedActivities, seedTeamMembers, seedBlacklist } from './seed-data';
import * as Crypto from 'expo-crypto';

const STORAGE_KEYS = {
  LEADS: '@propertyflow_leads',
  PROPERTIES: '@propertyflow_properties',
  DEALS: '@propertyflow_deals',
  FOLLOWUPS: '@propertyflow_followups',
  ACTIVITIES: '@propertyflow_activities',
  USER: '@propertyflow_user',
  SEEDED: '@propertyflow_seeded_v2',
  STATUS_HISTORY: '@propertyflow_status_history',
  AI_MATCHES: '@propertyflow_ai_matches',
  TEAM_MEMBERS: '@propertyflow_team_members',
  BLACKLIST: '@propertyflow_blacklist',
  SAVED_FILTERS: '@propertyflow_saved_filters',
};

interface DataContextValue {
  leads: Lead[];
  properties: Property[];
  deals: Deal[];
  followUps: FollowUp[];
  activities: Activity[];
  user: UserProfile | null;
  isLoading: boolean;
  statusHistory: PropertyStatusHistory[];
  aiMatches: AIMatch[];
  teamMembers: TeamMember[];
  blacklist: BlacklistEntry[];
  savedFilters: SavedFilter[];

  login: (name: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;

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

  addToBlacklist: (entry: Omit<BlacklistEntry, 'id' | 'blockedAt'>) => Promise<BlacklistEntry>;
  removeFromBlacklist: (id: string) => Promise<void>;
  isPhoneBlacklisted: (phone: string) => boolean;
  isEmailBlacklisted: (email: string) => boolean;

  saveFilter: (filter: Omit<SavedFilter, 'id' | 'createdAt'>) => Promise<SavedFilter>;
  deleteFilter: (id: string) => Promise<void>;
  getFilteredProperties: (criteria: PropertyFilterCriteria) => Property[];
}

const DataContext = createContext<DataContextValue | null>(null);

function calculateMatchScore(lead: Lead, property: Property): { score: number; reasons: string[]; confidence: AIMatch['confidenceLevel'] } {
  let score = 0;
  const reasons: string[] = [];

  if (lead.budgetMin && lead.budgetMax && property.price) {
    if (property.price >= lead.budgetMin && property.price <= lead.budgetMax) {
      score += 30;
      reasons.push('Budget match');
    } else if (property.price < lead.budgetMin) {
      score += 15;
      reasons.push('Below budget');
    } else if (property.price <= lead.budgetMax * 1.1) {
      score += 20;
      reasons.push('Near budget');
    }
  }

  if (lead.preferredPropertyType && property.propertyType) {
    if (lead.preferredPropertyType === property.propertyType) {
      score += 25;
      reasons.push('Preferred type');
    }
  } else if (lead.propertyInterest && property.propertyType) {
    const interest = lead.propertyInterest.toLowerCase();
    if (interest.includes(property.propertyType) || interest.includes('bhk') && property.propertyType === 'residential') {
      score += 20;
      reasons.push('Property type match');
    }
  }

  if (lead.city && property.city) {
    if (lead.city.toLowerCase() === property.city.toLowerCase()) {
      score += 20;
      reasons.push('City match');
    }
  }

  if (lead.preferredBedrooms && property.bedrooms) {
    if (property.bedrooms >= lead.preferredBedrooms) {
      score += 15;
      reasons.push(`${property.bedrooms} BHK`);
    } else if (property.bedrooms === lead.preferredBedrooms - 1) {
      score += 8;
    }
  } else if (lead.propertyInterest && property.bedrooms) {
    const match = lead.propertyInterest.match(/(\d+)\s*bhk/i);
    if (match && parseInt(match[1]) === property.bedrooms) {
      score += 15;
      reasons.push(`${property.bedrooms} BHK match`);
    }
  }

  if (lead.preferredAmenities && lead.preferredAmenities.length > 0 && property.amenities.length > 0) {
    const matched = lead.preferredAmenities.filter(a =>
      property.amenities.some(pa => pa.toLowerCase().includes(a.toLowerCase()))
    );
    const amenityScore = Math.round((matched.length / lead.preferredAmenities.length) * 10);
    score += amenityScore;
    if (matched.length > 0) reasons.push(`${matched.length} amenities match`);
  }

  const finalScore = Math.min(100, score);
  const confidence: AIMatch['confidenceLevel'] = finalScore >= 70 ? 'high' : finalScore >= 40 ? 'medium' : 'low';
  return { score: finalScore, reasons, confidence };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusHistory, setStatusHistory] = useState<PropertyStatusHistory[]>([]);
  const [aiMatches, setAiMatches] = useState<AIMatch[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const seeded = await AsyncStorage.getItem(STORAGE_KEYS.SEEDED);
      if (!seeded) {
        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(seedLeads)),
          AsyncStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(seedProperties)),
          AsyncStorage.setItem(STORAGE_KEYS.DEALS, JSON.stringify(seedDeals)),
          AsyncStorage.setItem(STORAGE_KEYS.FOLLOWUPS, JSON.stringify(seedFollowUps)),
          AsyncStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(seedActivities)),
          AsyncStorage.setItem(STORAGE_KEYS.TEAM_MEMBERS, JSON.stringify(seedTeamMembers)),
          AsyncStorage.setItem(STORAGE_KEYS.BLACKLIST, JSON.stringify(seedBlacklist)),
          AsyncStorage.setItem(STORAGE_KEYS.STATUS_HISTORY, JSON.stringify([])),
          AsyncStorage.setItem(STORAGE_KEYS.AI_MATCHES, JSON.stringify([])),
          AsyncStorage.setItem(STORAGE_KEYS.SAVED_FILTERS, JSON.stringify([])),
          AsyncStorage.setItem(STORAGE_KEYS.SEEDED, 'true'),
        ]);
        setLeads(seedLeads);
        setProperties(seedProperties);
        setDeals(seedDeals);
        setFollowUps(seedFollowUps);
        setActivities(seedActivities);
        setTeamMembers(seedTeamMembers);
        setBlacklist(seedBlacklist);
      } else {
        const [l, p, d, f, a, sh, am, tm, bl, sf] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.LEADS),
          AsyncStorage.getItem(STORAGE_KEYS.PROPERTIES),
          AsyncStorage.getItem(STORAGE_KEYS.DEALS),
          AsyncStorage.getItem(STORAGE_KEYS.FOLLOWUPS),
          AsyncStorage.getItem(STORAGE_KEYS.ACTIVITIES),
          AsyncStorage.getItem(STORAGE_KEYS.STATUS_HISTORY),
          AsyncStorage.getItem(STORAGE_KEYS.AI_MATCHES),
          AsyncStorage.getItem(STORAGE_KEYS.TEAM_MEMBERS),
          AsyncStorage.getItem(STORAGE_KEYS.BLACKLIST),
          AsyncStorage.getItem(STORAGE_KEYS.SAVED_FILTERS),
        ]);
        setLeads(l ? JSON.parse(l) : []);
        setProperties(p ? JSON.parse(p) : []);
        setDeals(d ? JSON.parse(d) : []);
        setFollowUps(f ? JSON.parse(f) : []);
        setActivities(a ? JSON.parse(a) : []);
        setStatusHistory(sh ? JSON.parse(sh) : []);
        setAiMatches(am ? JSON.parse(am) : []);
        setTeamMembers(tm ? JSON.parse(tm) : seedTeamMembers);
        setBlacklist(bl ? JSON.parse(bl) : seedBlacklist);
        setSavedFilters(sf ? JSON.parse(sf) : []);
      }

      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (userData) setUser(JSON.parse(userData));
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const persist = async (key: string, data: unknown) => {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  };

  const login = useCallback(async (name: string, phone: string) => {
    const profile: UserProfile = { name, phone, role: 'agent', isLoggedIn: true };
    setUser(profile);
    await persist(STORAGE_KEYS.USER, profile);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  }, []);

  const addLead = useCallback(async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> => {
    const now = new Date().toISOString();
    const newLead: Lead = { ...lead, id: Crypto.randomUUID(), createdAt: now, updatedAt: now };
    const updated = [newLead, ...leads];
    setLeads(updated);
    await persist(STORAGE_KEYS.LEADS, updated);
    const act: Activity = {
      id: Crypto.randomUUID(), leadId: newLead.id, type: 'created',
      description: `Lead created - ${lead.source} inquiry for ${lead.propertyInterest || 'property'}`,
      timestamp: now, agent: user?.name,
    };
    const updatedActs = [act, ...activities];
    setActivities(updatedActs);
    await persist(STORAGE_KEYS.ACTIVITIES, updatedActs);
    return newLead;
  }, [leads, activities, user]);

  const updateLead = useCallback(async (id: string, updates: Partial<Lead>) => {
    const updated = leads.map(l => l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l);
    setLeads(updated);
    await persist(STORAGE_KEYS.LEADS, updated);
  }, [leads]);

  const deleteLead = useCallback(async (id: string) => {
    const updated = leads.filter(l => l.id !== id);
    setLeads(updated);
    await persist(STORAGE_KEYS.LEADS, updated);
  }, [leads]);

  const addProperty = useCallback(async (property: Omit<Property, 'id' | 'createdAt'>): Promise<Property> => {
    const newProp: Property = { ...property, id: Crypto.randomUUID(), createdAt: new Date().toISOString() };
    const updated = [newProp, ...properties];
    setProperties(updated);
    await persist(STORAGE_KEYS.PROPERTIES, updated);
    return newProp;
  }, [properties]);

  const updateProperty = useCallback(async (id: string, updates: Partial<Property>) => {
    const updated = properties.map(p => p.id === id ? { ...p, ...updates } : p);
    setProperties(updated);
    await persist(STORAGE_KEYS.PROPERTIES, updated);
  }, [properties]);

  const addFollowUp = useCallback(async (followUp: Omit<FollowUp, 'id' | 'createdAt'>): Promise<FollowUp> => {
    const newFu: FollowUp = { ...followUp, id: Crypto.randomUUID(), createdAt: new Date().toISOString() };
    const updated = [newFu, ...followUps];
    setFollowUps(updated);
    await persist(STORAGE_KEYS.FOLLOWUPS, updated);
    return newFu;
  }, [followUps]);

  const updateFollowUp = useCallback(async (id: string, updates: Partial<FollowUp>) => {
    const updated = followUps.map(f => f.id === id ? { ...f, ...updates } : f);
    setFollowUps(updated);
    await persist(STORAGE_KEYS.FOLLOWUPS, updated);
  }, [followUps]);

  const addActivity = useCallback(async (activity: Omit<Activity, 'id'>) => {
    const newAct: Activity = { ...activity, id: Crypto.randomUUID() };
    const updated = [newAct, ...activities];
    setActivities(updated);
    await persist(STORAGE_KEYS.ACTIVITIES, updated);
  }, [activities]);

  const changePropertyStatus = useCallback(async (propertyId: string, newStatus: Property['status'], reason?: string) => {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;
    const history: PropertyStatusHistory = {
      id: Crypto.randomUUID(), propertyId,
      previousStatus: property.status, newStatus,
      reason, changedBy: user?.name || 'Agent',
      changedAt: new Date().toISOString(),
    };
    const updatedHistory = [history, ...statusHistory];
    setStatusHistory(updatedHistory);
    await persist(STORAGE_KEYS.STATUS_HISTORY, updatedHistory);
    await updateProperty(propertyId, { status: newStatus });
  }, [properties, statusHistory, user, updateProperty]);

  const getStatusHistoryForProperty = useCallback((propertyId: string) =>
    statusHistory.filter(h => h.propertyId === propertyId).sort((a, b) => b.changedAt.localeCompare(a.changedAt)),
    [statusHistory]);

  const getAIMatchesForLead = useCallback((leadId: string) =>
    aiMatches.filter(m => m.leadId === leadId).sort((a, b) => b.matchScore - a.matchScore),
    [aiMatches]);

  const calculateAndSaveMatches = useCallback(async (leadId: string): Promise<AIMatch[]> => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return [];

    const availableProperties = properties.filter(p => p.status === 'available' || p.status === 'under_offer');
    const existingMatchIds = new Set(aiMatches.filter(m => m.leadId === leadId).map(m => m.propertyId));

    const newMatches: AIMatch[] = [];
    for (const property of availableProperties) {
      if (existingMatchIds.has(property.id)) continue;
      const { score, reasons, confidence } = calculateMatchScore(lead, property);
      if (score >= 30) {
        newMatches.push({
          id: Crypto.randomUUID(), leadId, propertyId: property.id,
          matchScore: score, matchReasons: reasons, confidenceLevel: confidence,
          createdAt: new Date().toISOString(),
        });
      }
    }

    const allMatches = [...aiMatches, ...newMatches];
    setAiMatches(allMatches);
    await persist(STORAGE_KEYS.AI_MATCHES, allMatches);

    return allMatches.filter(m => m.leadId === leadId).sort((a, b) => b.matchScore - a.matchScore);
  }, [leads, properties, aiMatches]);

  const updateAIMatchResponse = useCallback(async (matchId: string, response: AIMatch['clientResponse']) => {
    const updated = aiMatches.map(m => m.id === matchId ? { ...m, clientResponse: response } : m);
    setAiMatches(updated);
    await persist(STORAGE_KEYS.AI_MATCHES, updated);
  }, [aiMatches]);

  const addTeamMember = useCallback(async (member: Omit<TeamMember, 'id' | 'createdAt'>): Promise<TeamMember> => {
    const newMember: TeamMember = { ...member, id: Crypto.randomUUID(), createdAt: new Date().toISOString() };
    const updated = [...teamMembers, newMember];
    setTeamMembers(updated);
    await persist(STORAGE_KEYS.TEAM_MEMBERS, updated);
    return newMember;
  }, [teamMembers]);

  const updateTeamMember = useCallback(async (id: string, updates: Partial<TeamMember>) => {
    const updated = teamMembers.map(m => m.id === id ? { ...m, ...updates } : m);
    setTeamMembers(updated);
    await persist(STORAGE_KEYS.TEAM_MEMBERS, updated);
  }, [teamMembers]);

  const deleteTeamMember = useCallback(async (id: string) => {
    const updated = teamMembers.filter(m => m.id !== id);
    setTeamMembers(updated);
    await persist(STORAGE_KEYS.TEAM_MEMBERS, updated);
  }, [teamMembers]);

  const updateTeamPermissions = useCallback(async (memberId: string, permissions: Partial<TeamPermissions>) => {
    const updated = teamMembers.map(m => m.id === memberId
      ? { ...m, permissions: { ...m.permissions, ...permissions } }
      : m);
    setTeamMembers(updated);
    await persist(STORAGE_KEYS.TEAM_MEMBERS, updated);
  }, [teamMembers]);

  const addToBlacklist = useCallback(async (entry: Omit<BlacklistEntry, 'id' | 'blockedAt'>): Promise<BlacklistEntry> => {
    const newEntry: BlacklistEntry = { ...entry, id: Crypto.randomUUID(), blockedAt: new Date().toISOString() };
    const updated = [newEntry, ...blacklist];
    setBlacklist(updated);
    await persist(STORAGE_KEYS.BLACKLIST, updated);
    if (entry.leadId) {
      await updateLead(entry.leadId, { isBlacklisted: true });
    }
    return newEntry;
  }, [blacklist, updateLead]);

  const removeFromBlacklist = useCallback(async (id: string) => {
    const entry = blacklist.find(b => b.id === id);
    const updated = blacklist.map(b => b.id === id ? { ...b, isActive: false } : b);
    setBlacklist(updated);
    await persist(STORAGE_KEYS.BLACKLIST, updated);
    if (entry?.leadId) {
      await updateLead(entry.leadId, { isBlacklisted: false });
    }
  }, [blacklist, updateLead]);

  const isPhoneBlacklisted = useCallback((phone: string) =>
    blacklist.some(b => b.isActive && b.phoneNumber === phone), [blacklist]);

  const isEmailBlacklisted = useCallback((email: string) =>
    blacklist.some(b => b.isActive && b.email === email), [blacklist]);

  const saveFilter = useCallback(async (filter: Omit<SavedFilter, 'id' | 'createdAt'>): Promise<SavedFilter> => {
    const newFilter: SavedFilter = { ...filter, id: Crypto.randomUUID(), createdAt: new Date().toISOString() };
    const updated = [newFilter, ...savedFilters];
    setSavedFilters(updated);
    await persist(STORAGE_KEYS.SAVED_FILTERS, updated);
    return newFilter;
  }, [savedFilters]);

  const deleteFilter = useCallback(async (id: string) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    await persist(STORAGE_KEYS.SAVED_FILTERS, updated);
  }, [savedFilters]);

  const getFilteredProperties = useCallback((criteria: PropertyFilterCriteria): Property[] => {
    return properties.filter(p => {
      if (criteria.propertyTypes && criteria.propertyTypes.length > 0) {
        if (!criteria.propertyTypes.includes(p.propertyType)) return false;
      }
      if (criteria.minPrice !== undefined && p.price < criteria.minPrice) return false;
      if (criteria.maxPrice !== undefined && p.price > criteria.maxPrice) return false;
      if (criteria.minArea !== undefined && p.carpetArea !== undefined && p.carpetArea < criteria.minArea) return false;
      if (criteria.maxArea !== undefined && p.carpetArea !== undefined && p.carpetArea > criteria.maxArea) return false;
      if (criteria.bedrooms !== undefined && p.bedrooms !== criteria.bedrooms) return false;
      if (criteria.furnishing && p.furnishing !== criteria.furnishing) return false;
      if (criteria.city && !p.city.toLowerCase().includes(criteria.city.toLowerCase())) return false;
      if (criteria.status && p.status !== criteria.status) return false;
      if (criteria.amenities && criteria.amenities.length > 0) {
        const hasAllAmenities = criteria.amenities.every(a =>
          p.amenities.some(pa => pa.toLowerCase().includes(a.toLowerCase()))
        );
        if (!hasAllAmenities) return false;
      }
      return true;
    });
  }, [properties]);

  const getLeadById = useCallback((id: string) => leads.find(l => l.id === id), [leads]);
  const getPropertyById = useCallback((id: string) => properties.find(p => p.id === id), [properties]);
  const getActivitiesForLead = useCallback((leadId: string) =>
    activities.filter(a => a.leadId === leadId).sort((a, b) => b.timestamp.localeCompare(a.timestamp)), [activities]);
  const getFollowUpsForLead = useCallback((leadId: string) => followUps.filter(f => f.leadId === leadId), [followUps]);
  const getDealsForLead = useCallback((leadId: string) => deals.filter(d => d.leadId === leadId), [deals]);

  const today = new Date().toISOString().split('T')[0];
  const todayFollowUps = useMemo(() =>
    followUps.filter(f => f.date === today && f.status === 'pending'), [followUps, today]);
  const overdueFollowUps = useMemo(() =>
    followUps.filter(f => f.date < today && (f.status === 'pending' || f.status === 'overdue')), [followUps, today]);

  const pipelineCounts = useMemo(() => {
    const counts: Record<LeadStatus, number> = { inquiry: 0, site_visit: 0, negotiation: 0, offer: 0, closed: 0, dead: 0 };
    leads.forEach(l => { counts[l.status]++; });
    return counts;
  }, [leads]);

  const value = useMemo(() => ({
    leads, properties, deals, followUps, activities, user, isLoading,
    statusHistory, aiMatches, teamMembers, blacklist, savedFilters,
    login, logout,
    addLead, updateLead, deleteLead,
    addProperty, updateProperty,
    addFollowUp, updateFollowUp,
    addActivity,
    getLeadById, getPropertyById, getActivitiesForLead, getFollowUpsForLead, getDealsForLead,
    todayFollowUps, overdueFollowUps, pipelineCounts,
    changePropertyStatus, getStatusHistoryForProperty,
    getAIMatchesForLead, calculateAndSaveMatches, updateAIMatchResponse,
    addTeamMember, updateTeamMember, deleteTeamMember, updateTeamPermissions,
    addToBlacklist, removeFromBlacklist, isPhoneBlacklisted, isEmailBlacklisted,
    saveFilter, deleteFilter, getFilteredProperties,
  }), [
    leads, properties, deals, followUps, activities, user, isLoading,
    statusHistory, aiMatches, teamMembers, blacklist, savedFilters,
    login, logout, addLead, updateLead, deleteLead, addProperty, updateProperty,
    addFollowUp, updateFollowUp, addActivity,
    getLeadById, getPropertyById, getActivitiesForLead, getFollowUpsForLead, getDealsForLead,
    todayFollowUps, overdueFollowUps, pipelineCounts,
    changePropertyStatus, getStatusHistoryForProperty,
    getAIMatchesForLead, calculateAndSaveMatches, updateAIMatchResponse,
    addTeamMember, updateTeamMember, deleteTeamMember, updateTeamPermissions,
    addToBlacklist, removeFromBlacklist, isPhoneBlacklisted, isEmailBlacklisted,
    saveFilter, deleteFilter, getFilteredProperties,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
