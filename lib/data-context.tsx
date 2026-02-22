import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lead, Property, Deal, FollowUp, Activity, UserProfile, LeadStatus } from './types';
import { seedLeads, seedProperties, seedDeals, seedFollowUps, seedActivities } from './seed-data';
import * as Crypto from 'expo-crypto';

const STORAGE_KEYS = {
  LEADS: '@propertyflow_leads',
  PROPERTIES: '@propertyflow_properties',
  DEALS: '@propertyflow_deals',
  FOLLOWUPS: '@propertyflow_followups',
  ACTIVITIES: '@propertyflow_activities',
  USER: '@propertyflow_user',
  SEEDED: '@propertyflow_seeded',
};

interface DataContextValue {
  leads: Lead[];
  properties: Property[];
  deals: Deal[];
  followUps: FollowUp[];
  activities: Activity[];
  user: UserProfile | null;
  isLoading: boolean;

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
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const seeded = await AsyncStorage.getItem(STORAGE_KEYS.SEEDED);
      if (!seeded) {
        await AsyncStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(seedLeads));
        await AsyncStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(seedProperties));
        await AsyncStorage.setItem(STORAGE_KEYS.DEALS, JSON.stringify(seedDeals));
        await AsyncStorage.setItem(STORAGE_KEYS.FOLLOWUPS, JSON.stringify(seedFollowUps));
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(seedActivities));
        await AsyncStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
        setLeads(seedLeads);
        setProperties(seedProperties);
        setDeals(seedDeals);
        setFollowUps(seedFollowUps);
        setActivities(seedActivities);
      } else {
        const [l, p, d, f, a] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.LEADS),
          AsyncStorage.getItem(STORAGE_KEYS.PROPERTIES),
          AsyncStorage.getItem(STORAGE_KEYS.DEALS),
          AsyncStorage.getItem(STORAGE_KEYS.FOLLOWUPS),
          AsyncStorage.getItem(STORAGE_KEYS.ACTIVITIES),
        ]);
        setLeads(l ? JSON.parse(l) : []);
        setProperties(p ? JSON.parse(p) : []);
        setDeals(d ? JSON.parse(d) : []);
        setFollowUps(f ? JSON.parse(f) : []);
        setActivities(a ? JSON.parse(a) : []);
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
      id: Crypto.randomUUID(),
      leadId: newLead.id,
      type: 'created',
      description: `Lead created - ${lead.source} inquiry for ${lead.propertyInterest || 'property'}`,
      timestamp: now,
      agent: user?.name,
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
    login, logout,
    addLead, updateLead, deleteLead,
    addProperty, updateProperty,
    addFollowUp, updateFollowUp,
    addActivity,
    getLeadById, getPropertyById, getActivitiesForLead, getFollowUpsForLead, getDealsForLead,
    todayFollowUps, overdueFollowUps, pipelineCounts,
  }), [leads, properties, deals, followUps, activities, user, isLoading,
    login, logout, addLead, updateLead, deleteLead, addProperty, updateProperty,
    addFollowUp, updateFollowUp, addActivity,
    getLeadById, getPropertyById, getActivitiesForLead, getFollowUpsForLead, getDealsForLead,
    todayFollowUps, overdueFollowUps, pipelineCounts]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
