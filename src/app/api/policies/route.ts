import { db } from "@/db";
import { policies, policyFiles } from "@/db/schema";
import { listPolicies, toListItem } from "@/lib/server/pipeline";
import { MAX_UPLOAD_BYTES } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json({ policies: await listPolicies() });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "server_error", message: "Could not load policies." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "bad_request", message: "Expected a multipart upload." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "bad_request", message: "No file was provided." }, { status: 400 });
  }
  if (file.size === 0) {
    return Response.json({ error: "unsupported_pdf", message: "This PDF is empty. Please choose a policy document with content." }, { status: 415 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "too_large", message: "This file is larger than the 15 MB limit." }, { status: 413 });
  }
  const isPdfName = /\.pdf$/i.test(file.name);
  if (!isPdfName && file.type !== "application/pdf") {
    return Response.json({ error: "unsupported_pdf", message: "Only PDF files are supported." }, { status: 415 });
  }
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    // PDF producers may place a short binary comment before the header, but it must
    // appear close to the start of the stream. MIME type and extension alone are not trusted.
    if (buf.subarray(0, Math.min(buf.length, 1024)).indexOf(Buffer.from("%PDF-")) < 0) {
      return Response.json({ error: "unsupported_pdf", message: "This file does not contain a valid PDF header." }, { status: 415 });
    }
    const fileName = file.name.replace(/[\\/\u0000-\u001f]/g, "_").trim().slice(0, 180) || "policy.pdf";
    const row = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(policies)
        .values({ fileName, fileSize: file.size, status: "extracting" })
        .returning();
      await tx.insert(policyFiles).values({ policyId: created.id, data: buf });
      return created;
    });
    return Response.json({ policy: toListItem(row) }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "server_error", message: "Upload failed on the server." }, { status: 500 });
  }
}
