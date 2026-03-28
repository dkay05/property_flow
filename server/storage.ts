import { db } from "./db";
import { teamMembers } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { TeamMember, InsertTeamMember } from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<TeamMember | undefined>;
  getUserByUsername(username: string): Promise<TeamMember | undefined>;
  createUser(user: InsertTeamMember): Promise<TeamMember>;
}

export class DBStorage implements IStorage {
  async getUser(id: string) {
    const [m] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return m;
  }
  async getUserByUsername(username: string) {
    const [m] = await db.select().from(teamMembers).where(eq(teamMembers.phone, username));
    return m;
  }
  async createUser(user: InsertTeamMember) {
    const [m] = await db.insert(teamMembers).values(user).returning();
    return m;
  }
}

export const storage = new DBStorage();
