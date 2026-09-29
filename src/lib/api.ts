import type {
  AskResponse,
  CompareResult,
  EstimateInput,
  EstimateResult,
  PageContent,
  Policy,
  PolicyListItem,
  ReportItem,
} from "./types";
import { mockApi } from "./mocks";

export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  } catch {
    throw new ApiError("network_error", "Could not reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error ?? "server_error", data?.message ?? "Something went wrong on the server.", res.status);
  }
  return data as T;
}

export async function listPolicies(): Promise<PolicyListItem[]> {
  if (USE_MOCKS) return mockApi.listPolicies();
  return (await request<{ policies: PolicyListItem[] }>("/api/policies")).policies;
}

/** Uploads a PDF, reporting real byte-level upload progress (0–1). */
export function uploadPolicy(file: File, onProgress?: (fraction: number) => void): Promise<PolicyListItem> {
  if (USE_MOCKS) {
    onProgress?.(1);
    return mockApi.createPolicy(file.name, file.size);
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/policies");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let data: { policy?: PolicyListItem; error?: string; message?: string } | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data?.policy) resolve(data.policy);
      else reject(new ApiError(data?.error ?? "server_error", data?.message ?? "Upload failed.", xhr.status));
    };
    xhr.onerror = () => reject(new ApiError("network_error", "Upload failed — could not reach the server."));
    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}

export async function createSamplePolicy(): Promise<PolicyListItem> {
  if (USE_MOCKS) return mockApi.createPolicy("Sample – CareShield Health Policy.pdf", 9000);
  return (await request<{ policy: PolicyListItem }>("/api/policies/sample", { method: "POST" })).policy;
}

/** Runs the next real processing stage on the server and returns the resulting status. */
export async function processPolicy(id: string): Promise<PolicyListItem> {
  if (USE_MOCKS) return mockApi.processPolicy(id);
  return (await request<{ policy: PolicyListItem }>(`/api/policies/${id}/process`, { method: "POST" })).policy;
}

export async function getPolicy(id: string): Promise<Policy> {
  if (USE_MOCKS) return mockApi.getPolicy(id);
  return (await request<{ policy: Policy }>(`/api/policies/${id}`)).policy;
}

export async function getPolicyPage(id: string, page: number): Promise<PageContent> {
  if (USE_MOCKS) return mockApi.getPage(id, page);
  return request<PageContent>(`/api/policies/${id}/pages/${page}`);
}

export async function askPolicy(id: string, question: string): Promise<AskResponse> {
  if (USE_MOCKS) return mockApi.ask(id, question);
  return (await request<{ answer: AskResponse }>(`/api/policies/${id}/ask`, { method: "POST", body: JSON.stringify({ question }) })).answer;
}

/** Analyses a scenario without saving it (coverage, restrictions and missing inputs). */
export async function analyzeScenario(policyId: string, input: EstimateInput): Promise<EstimateResult> {
  if (USE_MOCKS) return mockApi.estimate(policyId, input, false);
  return (await request<{ result: EstimateResult }>("/api/estimate", { method: "POST", body: JSON.stringify({ policyId, input, save: false }) })).result;
}

/** Runs and saves a full treatment estimate as a report. */
export async function estimateTreatment(policyId: string, input: EstimateInput): Promise<EstimateResult> {
  if (USE_MOCKS) return mockApi.estimate(policyId, input, true);
  return (await request<{ result: EstimateResult }>("/api/estimate", { method: "POST", body: JSON.stringify({ policyId, input, save: true }) })).result;
}

export async function compareScenarios(policyId: string, a: EstimateInput, b: EstimateInput): Promise<CompareResult> {
  if (USE_MOCKS) return mockApi.compare(policyId, a, b);
  return (await request<{ result: CompareResult }>("/api/compare", { method: "POST", body: JSON.stringify({ policyId, a, b }) })).result;
}

export async function deletePolicy(id: string): Promise<void> {
  if (USE_MOCKS) return mockApi.deletePolicy(id);
  await request(`/api/policies/${id}`, { method: "DELETE" });
}

export async function listReports(policyId?: string): Promise<ReportItem[]> {
  if (USE_MOCKS) return mockApi.listReports(policyId);
  return (await request<{ reports: ReportItem[] }>(`/api/reports${policyId ? `?policyId=${policyId}` : ""}`)).reports;
}

export async function deleteReport(id: string): Promise<void> {
  if (USE_MOCKS) return mockApi.deleteReport(id);
  await request(`/api/reports?id=${id}`, { method: "DELETE" });
}
