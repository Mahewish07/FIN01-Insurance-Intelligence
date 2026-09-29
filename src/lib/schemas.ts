import { z } from "zod";

const optionalMoney = z.number().min(0).max(1_000_000_000).nullable().optional();
const optionalPositiveMoney = z.number().positive("Enter an amount greater than zero").max(1_000_000_000).nullable().optional();

export const estimateInputSchema = z.object({
  treatment: z.string().trim().min(2, "Enter a treatment").max(120),
  city: z.string().trim().min(2, "Enter a city").max(60),
  hospitalTier: z.enum(["premium", "standard", "budget"]),
  patientAge: z.number({ message: "Enter age" }).int().min(0).max(110),
  networkHospital: z.boolean(),
  roomType: z.enum(["general", "shared", "single", "deluxe", "suite"]),
  preExisting: z.boolean(),
  policyYears: z.number({ message: "Enter years" }).int().min(0).max(60),
  sumInsured: optionalPositiveMoney.transform((v) => v ?? null),
  alreadyUtilized: optionalMoney.transform((v) => v ?? null),
  roomRentLimitOverride: optionalPositiveMoney,
  subLimitOverride: optionalPositiveMoney,
  copayOverride: z.number().min(0).max(100).nullable().optional(),
  deductibleOverride: optionalPositiveMoney,
  deductibleAlreadyMet: optionalMoney,
  lengthOfStay: z.number().int().min(0).max(120).nullable().optional(),
  billOverride: optionalPositiveMoney,
});

export type EstimateFormValues = z.input<typeof estimateInputSchema>;

export const estimateRequestSchema = z.object({
  policyId: z.string().uuid(),
  input: estimateInputSchema,
  save: z.boolean().optional(),
});

export const compareRequestSchema = z.object({
  policyId: z.string().uuid(),
  a: estimateInputSchema,
  b: estimateInputSchema,
});

export const askRequestSchema = z.object({
  question: z.string().trim().min(3, "Question is too short").max(500),
});
