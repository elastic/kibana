/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  describePathWritability,
  getFieldRegistryEntry,
  getOsLessRemainderEntries,
  getProtectionKeyPathEntries,
  searchPolicyFields,
  type FieldRegistryEntry,
  type PathNotWritableReason,
  type PolicyFieldSearchHit,
  type PolicyFieldSearchResult,
} from '../domain/field_registry';
import {
  POLICY_CHANGE_PREPARATION_ERROR_CODE,
  POLICY_CHANGE_SCHEMA_MESSAGE,
  PolicyChangePreparationError,
} from '../domain/impact';
import {
  getSetFieldValueDomain,
  type SetFieldValueDomain,
} from '../domain/impact/validate_set_field_value';
import { POLICY_IDENTIFIER_MAX_LENGTH, policyPathInputSchema } from '../domain/input_schemas';

export type FieldReferenceDocumentationAvailability = 'absent' | 'present';

export type FieldReferenceLongFormGuidance = 'not_retrieved_by_this_tool';

export interface FieldReferenceWritabilityFacts {
  readonly writable: boolean;
  readonly not_writable_reason?: PathNotWritableReason;
  readonly acceptedValues?: SetFieldValueDomain;
}

export interface PresentedFieldReferenceEntry extends FieldReferenceWritabilityFacts {
  readonly documentationAvailability: FieldReferenceDocumentationAvailability;
  readonly entry: FieldRegistryEntry;
}

export interface ExactFieldReferenceResult extends FieldReferenceWritabilityFacts {
  readonly found: true;
  readonly match: 'exact';
  readonly path: string;
  readonly documentationAvailability: FieldReferenceDocumentationAvailability;
  readonly longFormGuidance: FieldReferenceLongFormGuidance;
  readonly entry: FieldRegistryEntry;
}

export interface ProtectionKeyFieldReferenceResult {
  readonly found: true;
  readonly match: 'protection_key_path';
  readonly path: string;
  readonly longFormGuidance: FieldReferenceLongFormGuidance;
  readonly entries: readonly PresentedFieldReferenceEntry[];
}

export interface OsLessRemainderFieldReferenceResult {
  readonly found: true;
  readonly match: 'os_less_remainder';
  readonly path: string;
  readonly longFormGuidance: FieldReferenceLongFormGuidance;
  readonly entries: readonly PresentedFieldReferenceEntry[];
}

export interface UnknownFieldReferenceResult {
  readonly found: false;
  readonly match: 'none';
  readonly path: string;
  readonly reason: 'unknown_path';
}

export type FieldReferenceSearchHit = PolicyFieldSearchHit & FieldReferenceWritabilityFacts;

export interface SearchFieldReferenceResult extends Omit<PolicyFieldSearchResult, 'results'> {
  readonly results: readonly FieldReferenceSearchHit[];
}

export type FieldReferenceResult =
  | ExactFieldReferenceResult
  | ProtectionKeyFieldReferenceResult
  | OsLessRemainderFieldReferenceResult
  | SearchFieldReferenceResult
  | UnknownFieldReferenceResult;

export const getPolicyFieldReferenceParamsSchema = z
  .object({
    path: policyPathInputSchema.optional(),
    keywords: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(POLICY_IDENTIFIER_MAX_LENGTH)
          .refine((keyword) => !/\s/.test(keyword), {
            message:
              'Keywords are single words; send separate words or one word such as antivirus.',
          })
      )
      .min(1)
      .max(5)
      .optional(),
    os: z
      .enum(['windows', 'mac', 'linux'], {
        message: "os must be one of 'windows', 'mac', or 'linux'; use 'mac' for macOS.",
      })
      .optional(),
  })
  .strict();

export type GetPolicyFieldReferenceParams = z.infer<typeof getPolicyFieldReferenceParamsSchema>;

export type GetPolicyFieldReferenceSelector = Readonly<
  { path: string } | { keywords: readonly string[]; os?: 'windows' | 'mac' | 'linux' }
>;

export const parseGetPolicyFieldReferenceParams = (
  value: unknown
): GetPolicyFieldReferenceSelector => {
  const parsed = getPolicyFieldReferenceParamsSchema.safeParse(value);
  if (!parsed.success) {
    throw new PolicyChangePreparationError(
      POLICY_CHANGE_PREPARATION_ERROR_CODE.invalid_input,
      POLICY_CHANGE_SCHEMA_MESSAGE
    );
  }

  const { path, keywords, os } = parsed.data;
  if (path !== undefined && keywords === undefined && os === undefined) {
    return { path };
  }
  if (keywords !== undefined && path === undefined) {
    return os === undefined ? { keywords } : { keywords, os };
  }

  throw new PolicyChangePreparationError(
    POLICY_CHANGE_PREPARATION_ERROR_CODE.invalid_input,
    POLICY_CHANGE_SCHEMA_MESSAGE
  );
};

const documentationAvailabilityOf = (
  entry: FieldRegistryEntry
): FieldReferenceDocumentationAvailability =>
  entry.documentation !== undefined && entry.documentation.length > 0 ? 'present' : 'absent';

const describePathReferenceFacts = (path: string): FieldReferenceWritabilityFacts => {
  const writability = describePathWritability(path);
  if (writability.writable) {
    const acceptedValues = getSetFieldValueDomain(path);
    return {
      writable: true,
      ...(acceptedValues !== undefined ? { acceptedValues } : {}),
    };
  }

  return { writable: false, not_writable_reason: writability.reason };
};

const presentFieldReferenceEntry = (entry: FieldRegistryEntry): PresentedFieldReferenceEntry => ({
  ...describePathReferenceFacts(entry.path),
  documentationAvailability: documentationAvailabilityOf(entry),
  entry,
});

export const lookupFieldReference = (path: string): FieldReferenceResult => {
  const exact = getFieldRegistryEntry(path);
  if (exact !== undefined) {
    return {
      ...describePathReferenceFacts(path),
      found: true,
      match: 'exact',
      path,
      documentationAvailability: documentationAvailabilityOf(exact),
      longFormGuidance: 'not_retrieved_by_this_tool',
      entry: exact,
    };
  }

  const protectionEntries = getProtectionKeyPathEntries(path);
  if (protectionEntries.length > 0) {
    return {
      found: true,
      match: 'protection_key_path',
      path,
      longFormGuidance: 'not_retrieved_by_this_tool',
      entries: protectionEntries.map(presentFieldReferenceEntry),
    };
  }

  const remainderEntries = getOsLessRemainderEntries(path);
  if (remainderEntries.length > 0) {
    return {
      found: true,
      match: 'os_less_remainder',
      path,
      longFormGuidance: 'not_retrieved_by_this_tool',
      entries: remainderEntries.map(presentFieldReferenceEntry),
    };
  }

  return { found: false, match: 'none', path, reason: 'unknown_path' };
};

export const searchFieldReference = (
  keywords: readonly string[],
  os?: 'windows' | 'mac' | 'linux'
): SearchFieldReferenceResult => {
  const search = searchPolicyFields(keywords, os);
  return {
    ...search,
    results: search.results.map((hit): FieldReferenceSearchHit => {
      if (!hit.writable) {
        return hit;
      }

      const acceptedValues = getSetFieldValueDomain(hit.path);
      return acceptedValues === undefined ? hit : { ...hit, acceptedValues };
    }),
  };
};
