import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const envCheck = {
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasDirectUrl: !!process.env.DIRECT_URL,
    hasJwtSecret: !!process.env.JWT_SECRET,
    hasTermiiKey: !!process.env.TERMII_API_KEY,
    nodeEnv: process.env.NODE_ENV,
  };

  let dbStatus = "UNKNOWN";
  let dbError: string | null = null;
  let userCount = 0;
  let branchCount = 0;
  let usersList: string[] = [];

  try {
    const users = await db.user.findMany({
      select: { email: true, role: true, name: true },
      take: 10,
    });
    const branches = await db.branch.findMany({
      select: { code: true, name: true },
    });

    dbStatus = "CONNECTED";
    userCount = users.length;
    branchCount = branches.length;
    usersList = users.map((u) => `${u.email} (${u.role})`);
  } catch (err: any) {
    dbStatus = "FAILED";
    dbError = err?.message || String(err);
  }

  const isHealthy = dbStatus === "CONNECTED" && userCount > 0;

  return NextResponse.json(
    {
      status: isHealthy ? "OK" : "DEGRADED",
      timestamp: new Date().toISOString(),
      environment: envCheck,
      database: {
        status: dbStatus,
        branchesCount: branchCount,
        usersCount: userCount,
        users: usersList,
        error: dbError,
      },
      quickFixGuide: !isHealthy
        ? [
            "1. Check if your Supabase project is active (not paused) at https://supabase.com/dashboard",
            "2. Ensure DATABASE_URL in Vercel is set to the Supabase Transaction Pooler URL (Port 6543) with ?pgbouncer=true",
            "3. Ensure DIRECT_URL is set to the Supabase Session/Direct URL (Port 5432)",
            "4. If usersCount is 0, paste and run prisma/supabase_schema.sql in your Supabase SQL Editor to seed default staff users",
          ]
        : undefined,
    },
    { status: isHealthy ? 200 : 500 }
  );
}
