import { sql } from "drizzle-orm";
import {
  pgTable, text, varchar, boolean, integer, timestamp, jsonb, decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  role: text("role").notNull().default("agent"),
  isActive: boolean("is_active").notNull().default(true),
  isBlocked: boolean("is_blocked").notNull().default(false),
  blockedReason: text("blocked_reason"),
  blockedAt: timestamp("blocked_at"),
  permissions: jsonb("permissions").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  status: text("status").notNull().default("inquiry"),
  source: text("source").notNull().default("walk_in"),
  budgetMin: integer("budget_min"),
  budgetMax: integer("budget_max"),
  propertyInterest: text("property_interest"),
  preferredBedrooms: integer("preferred_bedrooms"),
  preferredPropertyType: text("preferred_property_type"),
  preferredAmenities: jsonb("preferred_amenities").default(sql`'[]'::jsonb`),
  city: text("city"),
  assignedTo: text("assigned_to"),
  assignedMemberId: varchar("assigned_member_id").references(() => teamMembers.id),
  notes: text("notes"),
  isBlacklisted: boolean("is_blacklisted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: text("address").notNull(),
  area: text("area").notNull(),
  city: text("city").notNull(),
  propertyType: text("property_type").notNull().default("residential"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  carpetArea: integer("carpet_area"),
  price: integer("price").notNull(),
  furnishing: text("furnishing").notNull().default("unfurnished"),
  status: text("status").notNull().default("available"),
  amenities: jsonb("amenities").default(sql`'[]'::jsonb`),
  ownerName: text("owner_name"),
  ownerPhone: text("owner_phone"),
  images: jsonb("images").default(sql`'[]'::jsonb`),
  latitude: decimal("latitude"),
  longitude: decimal("longitude"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const deals = pgTable("deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  status: text("status").notNull().default("inquiry"),
  offerPrice: integer("offer_price").notNull(),
  commissionRate: decimal("commission_rate").notNull().default("3"),
  commissionAmount: integer("commission_amount").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const followUps = pgTable("follow_ups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id),
  leadName: text("lead_name").notNull(),
  type: text("type").notNull().default("call"),
  date: text("date").notNull(),
  time: text("time"),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("pending"),
  assignedTo: varchar("assigned_to").references(() => teamMembers.id),
  priority: text("priority").notNull().default("normal"),
  reminderMinutes: integer("reminder_minutes").default(30),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id),
  type: text("type").notNull(),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  agent: text("agent"),
  agentId: varchar("agent_id").references(() => teamMembers.id),
});

export const statusHistory = pgTable("status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  previousStatus: text("previous_status").notNull(),
  newStatus: text("new_status").notNull(),
  reason: text("reason"),
  changedBy: text("changed_by").notNull(),
  changedById: varchar("changed_by_id").references(() => teamMembers.id),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});

export const blacklist = pgTable("blacklist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientName: text("client_name"),
  phoneNumber: text("phone_number"),
  email: text("email"),
  leadId: varchar("lead_id").references(() => leads.id),
  reason: text("reason").notNull().default("spam"),
  reasonDescription: text("reason_description"),
  blockedBy: text("blocked_by").notNull(),
  blockedById: varchar("blocked_by_id").references(() => teamMembers.id),
  blockedAt: timestamp("blocked_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const aiMatches = pgTable("ai_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  matchScore: integer("match_score").notNull(),
  matchReasons: jsonb("match_reasons").default(sql`'[]'::jsonb`),
  confidenceLevel: text("confidence_level").notNull().default("low"),
  clientResponse: text("client_response"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const savedFilters = pgTable("saved_filters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  filterType: text("filter_type").notNull().default("property"),
  criteria: jsonb("criteria").notNull().default(sql`'{}'::jsonb`),
  createdById: varchar("created_by_id").references(() => teamMembers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPropertySchema = createInsertSchema(properties).omit({ id: true, createdAt: true });
export const insertDealSchema = createInsertSchema(deals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFollowUpSchema = createInsertSchema(followUps).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true });
export const insertBlacklistSchema = createInsertSchema(blacklist).omit({ id: true, blockedAt: true });

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Deal = typeof deals.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type FollowUp = typeof followUps.$inferSelect;
export type InsertFollowUp = z.infer<typeof insertFollowUpSchema>;
export type Activity = typeof activities.$inferSelect;
export type StatusHistory = typeof statusHistory.$inferSelect;
export type BlacklistEntry = typeof blacklist.$inferSelect;
export type AIMatch = typeof aiMatches.$inferSelect;
export type SavedFilter = typeof savedFilters.$inferSelect;

export const users = teamMembers;
export type User = TeamMember;
export type InsertUser = InsertTeamMember;
export const insertUserSchema = insertTeamMemberSchema;
