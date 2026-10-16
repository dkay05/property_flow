import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { db } from "./db";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import authRouter from "./routes/auth";
import teamRouter from "./routes/team";
import leadsRouter from "./routes/leads";
import propertiesRouter from "./routes/properties";
import followupsRouter from "./routes/followups";
import dealsRouter from "./routes/deals";
import blacklistRouter from "./routes/blacklist";
import dashboardRouter from "./routes/dashboard";
import filtersRouter from "./routes/filters";
import uploadsRouter from "./routes/uploads";
import publicRouter from "./routes/public";

async function seedDatabase() {
  try {
    const existing = await db.select().from(schema.teamMembers).limit(1);
    if (existing.length > 0) return;

    console.log("Seeding database...");
    const ownerHash = await bcrypt.hash("owner123", 10);
    const agentHash = await bcrypt.hash("agent123", 10);

    const [owner] = await db.insert(schema.teamMembers).values({
      name: "Rajesh Kumar", phone: "9876543210", email: "rajesh@propertyflow.in",
      role: "owner", passwordHash: ownerHash, isActive: true,
      permissions: { manage_team: true, view_all_leads: true, edit_leads: true, delete_leads: true, manage_properties: true, view_reports: true, manage_blacklist: true, manage_filters: true, manage_deals: true, access_admin: true },
    }).returning();

    const [tl] = await db.insert(schema.teamMembers).values({
      name: "Vikram Singh", phone: "9876543211", email: "vikram@propertyflow.in",
      role: "team_lead", passwordHash: agentHash, isActive: true,
      permissions: { manage_team: false, view_all_leads: true, edit_leads: true, delete_leads: false, manage_properties: true, view_reports: true, manage_blacklist: true, manage_filters: true, manage_deals: true, access_admin: false },
    }).returning();

    const [ag1] = await db.insert(schema.teamMembers).values({
      name: "Meera Patel", phone: "9876543212", email: "meera@propertyflow.in",
      role: "agent", passwordHash: agentHash, isActive: true,
      permissions: { manage_team: false, view_all_leads: false, edit_leads: true, delete_leads: false, manage_properties: false, view_reports: false, manage_blacklist: false, manage_filters: true, manage_deals: true, access_admin: false },
    }).returning();

    const [ag2] = await db.insert(schema.teamMembers).values({
      name: "Sunil Verma", phone: "9876543213", email: "sunil@propertyflow.in",
      role: "agent", passwordHash: agentHash, isActive: true,
      permissions: { manage_team: false, view_all_leads: false, edit_leads: true, delete_leads: false, manage_properties: false, view_reports: false, manage_blacklist: false, manage_filters: true, manage_deals: true, access_admin: false },
    }).returning();

    // Seed properties
    const propData = [
      { address: "Flat 3B, Sunshine Towers", area: "Andheri West", city: "Mumbai", propertyType: "residential", bedrooms: 3, bathrooms: 2, carpetArea: 1200, price: 9500000, furnishing: "semi_furnished", status: "available", amenities: ["parking", "gym", "security"], ownerName: "Priya Sharma", ownerPhone: "9111111111" },
      { address: "Shop 12, Commerce Center", area: "BKC", city: "Mumbai", propertyType: "commercial", bedrooms: null, bathrooms: 1, carpetArea: 800, price: 15000000, furnishing: "unfurnished", status: "available", amenities: ["parking", "security", "power_backup"], ownerName: "Rakesh Jain", ownerPhone: "9222222222" },
      { address: "Villa 5, Palm Grove", area: "Powai", city: "Mumbai", propertyType: "villa", bedrooms: 4, bathrooms: 3, carpetArea: 2500, price: 25000000, furnishing: "fully_furnished", status: "sold", amenities: ["pool", "gym", "parking", "garden"], ownerName: "Amit Desai", ownerPhone: "9333333333" },
      { address: "2BHK, Green Valley Apt", area: "Thane West", city: "Thane", propertyType: "residential", bedrooms: 2, bathrooms: 2, carpetArea: 950, price: 7200000, furnishing: "semi_furnished", status: "available", amenities: ["parking", "security"], ownerName: "Sunita Rao", ownerPhone: "9444444444" },
      { address: "Studio, Tech Park View", area: "Hinjewadi", city: "Pune", propertyType: "residential", bedrooms: 1, bathrooms: 1, carpetArea: 450, price: 3500000, furnishing: "fully_furnished", status: "rented_out", amenities: ["gym", "security", "power_backup"], ownerName: "Vijay Nair", ownerPhone: "9555555555" },
      { address: "Plot 8, Greenfield Layout", area: "Whitefield", city: "Bangalore", propertyType: "plot", bedrooms: null, bathrooms: null, carpetArea: 1800, price: 12000000, furnishing: "unfurnished", status: "on_hold", amenities: [], ownerName: "Kavitha Menon", ownerPhone: "9666666666" },
    ];
    const insertedProps = await db.insert(schema.properties).values(propData as any).returning();

    // Seed leads
    const leadData = [
      { name: "Anil Sharma", phone: "9700000001", email: "anil@email.com", status: "site_visit", source: "referral", budgetMin: 8000000, budgetMax: 12000000, preferredPropertyType: "residential", preferredBedrooms: 3, city: "Mumbai", assignedTo: "Rajesh Kumar", assignedMemberId: owner.id, notes: "Looking for 3BHK in Andheri or Powai" },
      { name: "Kavitha Reddy", phone: "9700000002", email: "kavitha@email.com", status: "negotiation", source: "facebook", budgetMin: 5000000, budgetMax: 8000000, preferredPropertyType: "residential", preferredBedrooms: 2, city: "Thane", assignedTo: "Vikram Singh", assignedMemberId: tl.id, notes: "Urgent buyer, pre-approved loan" },
      { name: "Mohan Lal", phone: "9700000003", status: "inquiry", source: "walk_in", budgetMin: 20000000, budgetMax: 30000000, preferredPropertyType: "commercial", city: "Mumbai", assignedTo: "Meera Patel", assignedMemberId: ag1.id, notes: "Wants shop in BKC area" },
      { name: "Sneha Joshi", phone: "9700000004", email: "sneha@email.com", status: "deal_done", source: "website", budgetMin: 3000000, budgetMax: 5000000, preferredPropertyType: "residential", preferredBedrooms: 1, city: "Pune", assignedTo: "Sunil Verma", assignedMemberId: ag2.id, notes: "IT professional, needs good connectivity" },
      { name: "Fraud Client XYZ", phone: "9700000099", status: "inquiry", source: "walk_in", budgetMin: 1000000, budgetMax: 2000000, city: "Mumbai", assignedTo: "Rajesh Kumar", assignedMemberId: owner.id, isBlacklisted: true },
    ];
    const insertedLeads = await db.insert(schema.leads).values(leadData as any).returning();

    // Blacklist entry for fraud client
    const fraudLead = insertedLeads.find(l => l.isBlacklisted);
    if (fraudLead) {
      await db.insert(schema.blacklist).values({ clientName: "Fraud Client XYZ", phoneNumber: "9700000099", leadId: fraudLead.id, reason: "fraud", reasonDescription: "Bounced cheque, false identity", blockedBy: owner.name, blockedById: owner.id });
    }

    // Seed follow-ups
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const fmt = (d: Date) => d.toISOString().split("T")[0];

    await db.insert(schema.followUps).values([
      { leadId: insertedLeads[0].id, leadName: insertedLeads[0].name, type: "site_visit", date: fmt(tomorrow), time: "10:00", notes: "Confirm 3BHK availability in Andheri", status: "pending", assignedTo: owner.id, priority: "high" },
      { leadId: insertedLeads[1].id, leadName: insertedLeads[1].name, type: "call", date: fmt(today), time: "14:00", notes: "Discuss final offer", status: "pending", assignedTo: tl.id, priority: "urgent" },
      { leadId: insertedLeads[2].id, leadName: insertedLeads[2].name, type: "whatsapp", date: fmt(today), time: "11:00", notes: "Send property details", status: "pending", assignedTo: ag1.id, priority: "normal" },
      { leadId: insertedLeads[3].id, leadName: insertedLeads[3].name, type: "call", date: fmt(yesterday), time: "09:00", notes: "Follow up on documentation", status: "pending", assignedTo: ag2.id, priority: "high" },
    ]);

    // Seed deals
    await db.insert(schema.deals).values([
      { leadId: insertedLeads[3].id, propertyId: insertedProps[4].id, status: "deal_done", offerPrice: 3500000, commissionRate: "3", commissionAmount: 105000, notes: "Clean deal, all docs verified" },
      { leadId: insertedLeads[1].id, propertyId: insertedProps[3].id, status: "negotiation", offerPrice: 6500000, commissionRate: "2.5", commissionAmount: 162500, notes: "Counter offer pending" },
    ]);

    console.log("Database seeded successfully!");
  } catch (err) {
    console.error("Seed error:", err);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api/auth", authRouter);
  app.use("/api/team", teamRouter);
  app.use("/api/leads", leadsRouter);
  app.use("/api/properties", propertiesRouter);
  app.use("/api/followups", followupsRouter);
  app.use("/api/deals", dealsRouter);
  app.use("/api/blacklist", blacklistRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/filters", filtersRouter);
  app.use("/api/uploads", uploadsRouter);

  // Public, unauthenticated share pages.
  app.use("/", publicRouter);

  await seedDatabase();

  const httpServer = createServer(app);
  return httpServer;
}
