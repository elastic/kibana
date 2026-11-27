/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyOperatingSystem } from '../../../../../common/endpoint/types';
import type {
  FIELD_REFERENCE_MATCH_MODES,
  FIELD_REFERENCE_DOCUMENTATION_AVAILABILITY,
  FIELD_REFERENCE_LONG_FORM_GUIDANCE,
  FIELD_REFERENCE_UNKNOWN_PATH_REASON,
} from '../../../../../common/workflows/step_types/endpoint/policies/output_vocabularies';

import {
  policyFieldReferenceSelectorInputSchema,
  type GetPolicyFieldReferenceSelector,
} from '../../../../../common/workflows/step_types/endpoint/policies/field_reference';

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

export type FieldReferenceDocumentationAvailability =
  (typeof FIELD_REFERENCE_DOCUMENTATION_AVAILABILITY)[number];

export type FieldReferenceLongFormGuidance = typeof FIELD_REFERENCE_LONG_FORM_GUIDANCE;

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
  readonly match: typeof FIELD_REFERENCE_MATCH_MODES.exact;
  readonly path: string;
  readonly documentationAvailability: FieldReferenceDocumentationAvailability;
  readonly longFormGuidance: FieldReferenceLongFormGuidance;
  readonly entry: FieldRegistryEntry;
}

export interface ProtectionKeyFieldReferenceResult {
  readonly found: true;
  readonly match: typeof FIELD_REFERENCE_MATCH_MODES.protection_key_path;
  readonly path: string;
  readonly longFormGuidance: FieldReferenceLongFormGuidance;
  readonly entries: readonly PresentedFieldReferenceEntry[];
}

export interface OsLessRemainderFieldReferenceResult {
  readonly found: true;
  readonly match: typeof FIELD_REFERENCE_MATCH_MODES.os_less_remainder;
  readonly path: string;
  readonly longFormGuidance: FieldReferenceLongFormGuidance;
  readonly entries: readonly PresentedFieldReferenceEntry[];
}

export interface UnknownFieldReferenceResult {
  readonly found: false;
  readonly match: typeof FIELD_REFERENCE_MATCH_MODES.none;
  readonly path: string;
  readonly reason: typeof FIELD_REFERENCE_UNKNOWN_PATH_REASON;
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

export const parseGetPolicyFieldReferenceParams = (
  value: unknown
): GetPolicyFieldReferenceSelector => {
  const parsed = policyFieldReferenceSelectorInputSchema.safeParse(value);
  if (!parsed.success) {
    throw new PolicyChangePreparationError(
      POLICY_CHANGE_PREPARATION_ERROR_CODE.invalid_input,
      POLICY_CHANGE_SCHEMA_MESSAGE
    );
  }

  return parsed.data;
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
  os?: `${PolicyOperatingSystem}`
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
