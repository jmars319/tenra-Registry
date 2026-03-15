import {
  assignmentStatuses,
  assignmentTransitionTargets,
  assetCategories,
  assetStatuses,
  billingCadences,
  customerStatuses,
  organizationStatuses
} from "@registry/domain";
import { z } from "zod";

const entityIdSchema = z.string().min(1);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "Expected YYYY-MM-DD");
const trimmedOptionalString = z.string().trim().max(200).optional();
const optionalAddressString = z.string().trim().max(160).optional();

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/u, "Use lowercase letters, numbers, and hyphens only")
});

export const listOrganizationsSchema = z.object({
  status: z.enum(organizationStatuses).optional()
});

export const createCustomerSchema = z.object({
  organizationId: entityIdSchema,
  name: z.string().trim().min(1).max(120),
  companyName: z.string().trim().max(160).optional(),
  email: z.string().trim().email().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  billingStreet1: optionalAddressString,
  billingStreet2: optionalAddressString,
  billingCity: z.string().trim().max(80).optional(),
  billingState: z.string().trim().max(80).optional(),
  billingPostalCode: z.string().trim().max(20).optional(),
  billingCountry: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional()
});

export const listCustomersSchema = z.object({
  organizationId: entityIdSchema,
  status: z.enum(customerStatuses).optional()
});

export const createAssetSchema = z.object({
  organizationId: entityIdSchema,
  assetCode: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  category: z.enum(assetCategories),
  currentLocation: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional()
});

export const listAssetsSchema = z.object({
  organizationId: entityIdSchema,
  status: z.enum(assetStatuses).optional()
});

export const createAssignmentSchema = z.object({
  organizationId: entityIdSchema,
  customerId: entityIdSchema,
  assetId: entityIdSchema,
  startDate: dateSchema,
  endDate: dateSchema.optional(),
  billingCadence: z.enum(billingCadences),
  rateInCents: z.number().int().nonnegative(),
  status: z.enum(assignmentStatuses),
  notes: trimmedOptionalString
}).refine(
  (input) => !input.endDate || input.endDate >= input.startDate,
  {
    message: "End date must be on or after the start date.",
    path: ["endDate"]
  }
);

export const listAssignmentsSchema = z.object({
  organizationId: entityIdSchema,
  customerId: entityIdSchema.optional(),
  assetId: entityIdSchema.optional(),
  status: z.enum(assignmentStatuses).optional()
});

export const transitionAssignmentStatusSchema = z.object({
  organizationId: entityIdSchema,
  assignmentId: entityIdSchema,
  nextStatus: z.enum(assignmentTransitionTargets)
});
