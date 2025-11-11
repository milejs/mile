import { NextResponse } from "next/server";

function generateUUIDv4() {
  // Generate 16 random bytes
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Per RFC 4122: set bits for version and `clock_seq_hi_and_reserved`
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx

  // Convert bytes to UUID string format
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return (
    `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-` +
    `${hex[4]}${hex[5]}-` +
    `${hex[6]}${hex[7]}-` +
    `${hex[8]}${hex[9]}-` +
    `${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`
  );
}

export async function GET() {
  const workspaceId = generateUUIDv4();
  const responseBody = {
    workspaces: [
      {
        id: workspaceId,
        name: "My Next.js Project",
        folders: [
          {
            path: process.cwd(), // Or a more specific path to your source files
          },
        ],
      },
    ],
  };
  return NextResponse.json(responseBody);
}
