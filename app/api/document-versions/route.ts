import { NextRequest, NextResponse } from "next/server";
import { documentRepository } from "@/lib/repositories/documentRepository";
import { DocumentType } from "@/lib/domain/application";

const allowedTypes: DocumentType[] = ["CV", "Cover"];

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") as DocumentType | null;
  if (type && !allowedTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const versions = await documentRepository.listVersions(type ?? undefined);
  return NextResponse.json({ versions });
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      type?: DocumentType;
      label?: string;
      fileUrl?: string;
      text?: string;
    };

    if (!payload.type || !allowedTypes.includes(payload.type)) {
      return NextResponse.json({ error: "type must be CV or Cover" }, { status: 400 });
    }

    const version = await documentRepository.createVersion({
      type: payload.type,
      label: payload.label ?? "",
      fileUrl: payload.fileUrl,
      text: payload.text,
    });

    return NextResponse.json({ version }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create document version" },
      { status: 400 },
    );
  }
}
