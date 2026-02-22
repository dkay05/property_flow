export type LeadStatus = 'inquiry' | 'site_visit' | 'negotiation' | 'offer' | 'closed' | 'dead';
export type LeadSource = 'walk_in' | 'referral' | 'call' | 'website' | 'social_media';
export type PropertyType = 'residential' | 'commercial' | 'rental' | 'land';
export type FollowUpType = 'call' | 'site_visit' | 'whatsapp' | 'email' | 'sms';
export type FollowUpStatus = 'pending' | 'done' | 'overdue' | 'snoozed';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: LeadStatus;
  source: LeadSource;
  budgetMin?: number;
  budgetMax?: number;
  propertyInterest?: string;
  city?: string;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  address: string;
  area: string;
  city: string;
  propertyType: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  carpetArea?: number;
  price: number;
  furnishing: 'furnished' | 'semi_furnished' | 'unfurnished';
  status: 'available' | 'sold' | 'rented' | 'under_offer';
  amenities: string[];
  ownerName?: string;
  ownerPhone?: string;
  createdAt: string;
}

export interface Deal {
  id: string;
  leadId: string;
  propertyId: string;
  status: LeadStatus;
  offerPrice: number;
  commissionRate: number;
  commissionAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp {
  id: string;
  leadId: string;
  leadName: string;
  type: FollowUpType;
  date: string;
  time?: string;
  notes: string;
  status: FollowUpStatus;
  createdAt: string;
}

export interface Activity {
  id: string;
  leadId: string;
  type: 'created' | 'status_change' | 'call' | 'site_visit' | 'note' | 'offer' | 'follow_up';
  description: string;
  timestamp: string;
  agent?: string;
}

export interface UserProfile {
  name: string;
  phone: string;
  role: 'agent' | 'team_lead' | 'owner';
  isLoggedIn: boolean;
}
