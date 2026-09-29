import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
  customType,
  index,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const policies = pgTable("policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  status: text("status").notNull().default("uploaded"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  isSample: boolean("is_sample").notNull().default(false),
  pageCount: integer("page_count").notNull().default(0),
  pages: jsonb("pages").$type<string[]>(),
  meta: jsonb("meta"),
  terms: jsonb("terms"),
  summary: jsonb("summary"),
  /** Short-lived DB lease used to prevent two process requests from running the same stage. */
  processingAt: timestamp("processing_at"),
  /** Ownership token; a stale worker cannot commit after a newer lease takes over. */
  processingToken: uuid("processing_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const policyFiles = pgTable("policy_files", {
  policyId: uuid("policy_id")
    .primaryKey()
    .references(() => policies.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
});

export const policyChunks = pgTable(
  "policy_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    page: integer("page").notNull(),
    section: text("section").notNull(),
    heading: text("heading").notNull().default(""),
    category: text("category").notNull(),
    text: text("text").notNull(),
    ordinal: integer("ordinal").notNull().default(0),
    search: tsvector("search"),
  },
  (t) => [index("chunks_policy_idx").on(t.policyId), index("chunks_search_idx").using("gin", t.search)]
);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  policyId: uuid("policy_id").references(() => policies.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  input: jsonb("input"),
  result: jsonb("result"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
