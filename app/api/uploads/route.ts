import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "file cannot be empty" }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const extension = path.extname(file.name || "") || ".bin";
    const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const destination = path.join(uploadsDir, fileName);

    const bytes = await file.arrayBuffer();
    await writeFile(destination, Buffer.from(bytes));

    return NextResponse.json({ url: `/uploads/${fileName}` }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload file" },
      { status: 400 },
    );
  }
}
