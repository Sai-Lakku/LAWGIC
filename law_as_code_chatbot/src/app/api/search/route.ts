import { NextResponse } from "next/server";

export async function GET() {
  console.log("hit /api/search");  // for testing
  return NextResponse.json({ msg: "ok" });
}
