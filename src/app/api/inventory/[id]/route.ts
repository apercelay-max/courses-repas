import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB, nowIso } from "@/db/store";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const db = await readDB();
  const item = db.inventoryItems.find((i) => i.id === params.id);
  if (!item) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (body.quantity != null) item.quantity = Number(body.quantity);
  if (body.unit) item.unit = body.unit;
  if (body.location) item.location = body.location;
  if (body.expiryDate !== undefined) item.expiryDate = body.expiryDate;
  item.updatedAt = nowIso();

  await writeDB(db);
  return NextResponse.json({ item });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = await readDB();
  const before = db.inventoryItems.length;
  db.inventoryItems = db.inventoryItems.filter((i) => i.id !== params.id);
  if (db.inventoryItems.length === before) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  await writeDB(db);
  return NextResponse.json({ ok: true });
}
