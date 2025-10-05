import { NextResponse } from "next/server";
import { getDistance } from "@/lib/serial";

export async function GET() {
  const distance = getDistance();
  return NextResponse.json({ distance });
}
