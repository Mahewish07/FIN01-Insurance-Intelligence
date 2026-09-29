import { db } from "@/db";
import { policies } from "@/db/schema";
import { toListItem } from "@/lib/server/pipeline";
import { SAMPLE_FILE_NAME, SAMPLE_POLICY_PAGES } from "@/lib/engine/samplePolicy";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const size = SAMPLE_POLICY_PAGES.join("\n").length;
    const [row] = await db
      .insert(policies)
      .values({
        fileName: SAMPLE_FILE_NAME,
        fileSize: size,
        isSample: true,
        // Text is already available, so the pipeline starts at clause understanding.
        status: "understanding",
        pages: SAMPLE_POLICY_PAGES,
        pageCount: SAMPLE_POLICY_PAGES.length,
      })
      .returning();
    return Response.json({ policy: toListItem(row) }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "server_error", message: "Could not create the sample policy." }, { status: 500 });
  }
}
