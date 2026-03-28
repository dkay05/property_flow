export type LeadStatus = 'inquiry' | 'site_visit' | 'negotiation' | 'offer' | 'closed' | 'dead';
export type LeadSource = 'walk_in' | 'referral' | 'call' | 'website' | 'social_media';
export type PropertyType = 'residential' | 'commercial' | 'rental' | 'land';
export type PropertyStatus = 'available' | 'sold' | 'rented_out' | 'on_hold' | 'inactive' | 'under_offer';
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
  preferredBedrooms?: number;
  preferredPropertyType?: PropertyType;
  preferredAmenities?: string[];
  city?: string;
  assignedTo?: string;
  assignedMemberId?: string;
  notes?: string;
  isBlacklisted?: boolean;
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
  status: PropertyStatus;
  amenities: string[];
  ownerName?: string;
  ownerPhone?: string;
  images?: string[];
  latitude?: number;
  longitude?: number;
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
  assignedTo?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  reminderMinutes?: number;
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

export interface PropertyStatusHistory {
  id: string;
  propertyId: string;
  previousStatus: PropertyStatus;
  newStatus: PropertyStatus;
  reason?: string;
  changedBy: string;
  changedAt: string;
}

export interface AIMatch {
  id: string;
  leadId: string;
  propertyId: string;
  matchScore: number;
  matchReasons: string[];
  confidenceLevel: 'high' | 'medium' | 'low';
  clientResponse?: 'interested' | 'not_interested' | 'maybe';
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'owner' | 'team_lead' | 'agent' | 'custom';
  isActive: boolean;
  isBlocked?: boolean;
  blockedReason?: string;
  blockedAt?: string;
  permissions: TeamPermissions | Record<string, boolean>;
  createdAt: string;
}

export interface TeamPermissions {
  canViewLeads: boolean;
  canCreateLeads: boolean;
  canEditLeads: boolean;
  canDeleteLeads: boolean;
  canViewProperties: boolean;
  canCreateProperties: boolean;
  canEditProperties: boolean;
  canDeleteProperties: boolean;
  canViewDeals: boolean;
  canCreateDeals: boolean;
  canEditDeals: boolean;
  canCloseDeals: boolean;
  canViewAllTeamData: boolean;
  canAssignTasks: boolean;
  canManageTeam: boolean;
  canManageAIAgents: boolean;
  canAccessReports: boolean;
  canManagePermissions: boolean;
  canUseWhatsappAutomation: boolean;
  canUseAIMatching: boolean;
  canTogglePropertyStatus: boolean;
  canAddMedia: boolean;
}

export interface BlacklistEntry {
  id: string;
  clientName?: string;
  phoneNumber?: string;
  email?: string;
  leadId?: string;
  reason: 'spam' | 'fraud' | 'non_responsive' | 'difficult_client' | 'competitive' | 'other';
  reasonDescription?: string;
  blockedBy: string;
  blockedAt: string;
  unblockDate?: string;
  isActive: boolean;
}

export interface SavedFilter {
  id: string;
  name: string;
  filterType: 'property' | 'lead';
  criteria: PropertyFilterCriteria | LeadFilterCriteria;
  createdAt: string;
}

export interface PropertyFilterCriteria {
  propertyTypes?: PropertyType[];
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  bedrooms?: number;
  furnishing?: string;
  amenities?: string[];
  city?: string;
  status?: PropertyStatus;
}

export interface LeadFilterCriteria {
  status?: LeadStatus;
  source?: LeadSource;
  city?: string;
  minBudget?: number;
  maxBudget?: number;
  assignedTo?: string;
}

export const ROLE_PERMISSIONS: Record<string, TeamPermissions> = {
  owner: {
    canViewLeads: true, canCreateLeads: true, canEditLeads: true, canDeleteLeads: true,
    canViewProperties: true, canCreateProperties: true, canEditProperties: true, canDeleteProperties: true,
    canViewDeals: true, canCreateDeals: true, canEditDeals: true, canCloseDeals: true,
    canViewAllTeamData: true, canAssignTasks: true, canManageTeam: true, canManageAIAgents: true,
    canAccessReports: true, canManagePermissions: true, canUseWhatsappAutomation: true,
    canUseAIMatching: true, canTogglePropertyStatus: true, canAddMedia: true,
  },
  team_lead: {
    canViewLeads: true, canCreateLeads: true, canEditLeads: true, canDeleteLeads: false,
    canViewProperties: true, canCreateProperties: true, canEditProperties: true, canDeleteProperties: false,
    canViewDeals: true, canCreateDeals: true, canEditDeals: true, canCloseDeals: true,
    canViewAllTeamData: true, canAssignTasks: true, canManageTeam: false, canManageAIAgents: false,
    canAccessReports: true, canManagePermissions: false, canUseWhatsappAutomation: true,
    canUseAIMatching: true, canTogglePropertyStatus: true, canAddMedia: true,
  },
  agent: {
    canViewLeads: true, canCreateLeads: true, canEditLeads: false, canDeleteLeads: false,
    canViewProperties: true, canCreateProperties: false, canEditProperties: false, canDeleteProperties: false,
    canViewDeals: true, canCreateDeals: true, canEditDeals: false, canCloseDeals: false,
    canViewAllTeamData: false, canAssignTasks: false, canManageTeam: false, canManageAIAgents: false,
    canAccessReports: false, canManagePermissions: false, canUseWhatsappAutomation: false,
    canUseAIMatching: true, canTogglePropertyStatus: false, canAddMedia: false,
  },
};
