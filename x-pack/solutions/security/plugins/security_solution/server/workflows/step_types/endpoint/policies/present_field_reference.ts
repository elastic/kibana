/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FieldReferenceResult,
  PresentedFieldReferenceEntry,
} from '../../../../endpoint/services/policy_management/services/field_reference';
import type { FieldRegistryEntry } from '../../../../endpoint/services/policy_management/domain/field_registry';
import type {
  TrimLimits,
  TrimSummary,
} from '../../../../endpoint/services/policy_management/presentation/trim_policy_result';
import {
  omitTrailingToFit,
  MAX_SUMMARY_ENTRIES,
  TIGHTEST_TRIM_LIMITS,
  presentWithinGuardedBudget,
  trimPolicyResultWithMeta,
} from '../../../../endpoint/services/policy_management/presentation/trim_policy_result';

import { RESULT_LIMIT } from '../../../../../common/workflows/step_types/endpoint/policies/field_reference';

const FIELD_REFERENCE_MAX_RESULT_TOKENS = 12_000;

export const presentFieldReference = (reference: FieldReferenceResult): object => {
  const build = (limits: TrimLimits, keep: number): object => {
    const entries: TrimSummary['entries'][number][] = [];
    let entriesTotal = 0;
    const trimValue = (value: FieldRegistryEntry['defaultValue'], path: string) => {
      const trimmed = trimPolicyResultWithMeta(value, limits);
      if (trimmed.summary !== undefined) {
        entries.push(
          ...trimmed.summary.entries.map((entry) => ({
            ...entry,
            path: `${path}${entry.path ? `.${entry.path}` : ''}`,
          }))
        );
        entriesTotal += trimmed.summary.entries_total ?? trimmed.summary.entries.length;
      }
      return trimmed.value;
    };
    const trimEntry = (entry: FieldRegistryEntry, prefix: string): FieldRegistryEntry => ({
      ...entry,
      ...(entry.defaultValue !== undefined
        ? { defaultValue: trimValue(entry.defaultValue, `${prefix}.defaultValue`) }
        : {}),
      ...(entry.documentation !== undefined
        ? { documentation: String(trimValue(entry.documentation, `${prefix}.documentation`)) }
        : {}),
    });
    const trimPresentedEntry = (
      entry: PresentedFieldReferenceEntry,
      index: number
    ): PresentedFieldReferenceEntry => ({
      ...entry,
      entry: trimEntry(entry.entry, `entries.${index}.entry`),
    });
    let result: object = reference;
    if ('entry' in reference) {
      result = { ...reference, entry: trimEntry(reference.entry, 'entry') };
    } else if ('entries' in reference) {
      result = {
        ...reference,
        entries: reference.entries.slice(0, keep).map(trimPresentedEntry),
        ...(keep < reference.entries.length
          ? { entries_truncated: true, entries_total: reference.entries.length }
          : {}),
      };
    } else if ('results' in reference) {
      result = {
        ...reference,
        results: reference.results.slice(0, Math.min(RESULT_LIMIT, keep)),
        results_truncated: reference.results_truncated || keep < reference.results.length,
      };
    }
    return {
      result,
      ...(entries.length > 0
        ? {
            truncation: {
              entries: entries.slice(0, MAX_SUMMARY_ENTRIES),
              ...(entriesTotal > MAX_SUMMARY_ENTRIES
                ? { entries_truncated: true, entries_total: entriesTotal }
                : {}),
            },
          }
        : {}),
    };
  };
  const total =
    'entries' in reference
      ? reference.entries.length
      : 'results' in reference
      ? Math.min(RESULT_LIMIT, reference.results.length)
      : 1;
  return presentWithinGuardedBudget(
    (limits) => build(limits, total),
    FIELD_REFERENCE_MAX_RESULT_TOKENS,
    () =>
      omitTrailingToFit(
        (keep) => build(TIGHTEST_TRIM_LIMITS, keep),
        total,
        FIELD_REFERENCE_MAX_RESULT_TOKENS
      )
  );
};
