/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createHash } from 'crypto';
import {
  replaceAnonymizedValuesWithOriginalValues,
  transformRawData,
  type Replacements,
} from '@kbn/elastic-assistant-common';
import type { AnonymizedAlert } from '../types';
import { DEFAULT_ALLOWLIST, DEFAULT_ALLOW_REPLACEMENT, ENRICHED_FIELDS } from './default_allowlist';
import type { AuditAlert, AuditInputVariant } from './types';

const BASELINE_FIELDS: ReadonlySet<string> = new Set(DEFAULT_ALLOWLIST);
const ENRICHED_FIELD_SET: ReadonlySet<string> = new Set([...DEFAULT_ALLOWLIST, ...ENRICHED_FIELDS]);
const REPLACEMENT_FIELDS: ReadonlySet<string> = new Set(DEFAULT_ALLOW_REPLACEMENT);

export const getVariantFields = (variant: AuditInputVariant): ReadonlySet<string> =>
  variant === 'baseline' ? BASELINE_FIELDS : ENRICHED_FIELD_SET;

/**
 * The product default anonymization fields for a variant: every sent field is allowed, and the
 * ones in `DEFAULT_ALLOW_REPLACEMENT` are anonymized. The enriched variant widens the allowlist;
 * its extra fields are anonymized only if the product rules would anonymize them.
 */
export const getAnonymizationFields = (
  variant: AuditInputVariant
): Array<{ id: string; field: string; allowed: boolean; anonymized: boolean }> =>
  Array.from(getVariantFields(variant)).map((field) => ({
    id: field,
    field,
    allowed: true,
    anonymized: REPLACEMENT_FIELDS.has(field),
  }));

/** The example-level seed: tokens are stable across runs and differ between examples. */
export const getAnonymizationSeed = (scenarioId: string, variant: AuditInputVariant): string =>
  `${scenarioId}.${variant}`;

/**
 * Deterministic stand-in for the product's random v4 token, shaped like one. The same value
 * always maps to the same token for a given seed, which is the product's within-run guarantee,
 * and re-running the eval produces identical prompts.
 */
export const createSeededGetAnonymizedValue =
  (seed: string) =>
  ({ rawValue }: { currentReplacements: Replacements | undefined; rawValue: string }): string => {
    const hex = createHash('sha256').update(`${seed}\u0000${rawValue}`).digest('hex');
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      `4${hex.slice(13, 16)}`,
      `a${hex.slice(17, 20)}`,
      hex.slice(20, 32),
    ].join('-');
  };

export interface RenderedAlerts {
  anonymizedAlerts: AnonymizedAlert[];
  /** Token to original value, accumulated over every alert of the example. */
  replacements: Replacements;
}

/**
 * Renders alerts the way product Attack Discovery does: `transformRawData` over the allowed
 * fields with the product default anonymization rules, producing one `field,value` line per
 * field with keys sorted. `_id` is never anonymized, so cited alert ids stay real.
 */
export const renderAlerts = (
  alerts: readonly AuditAlert[],
  variant: AuditInputVariant,
  seed: string
): RenderedAlerts => {
  const allowed = getVariantFields(variant);
  const anonymizationFields = getAnonymizationFields(variant);
  const getAnonymizedValue = createSeededGetAnonymizedValue(seed);
  let replacements: Replacements = {};

  const anonymizedAlerts = alerts.map((alert): AnonymizedAlert => {
    const rawData: Record<string, unknown[]> = { _id: [alert.id] };
    for (const [field, value] of Object.entries(alert.fields)) {
      if (allowed.has(field)) {
        rawData[field] = [value];
      }
    }

    const pageContent = transformRawData({
      anonymizationFields,
      currentReplacements: replacements,
      getAnonymizedValue,
      onNewReplacements: (newReplacements) => {
        replacements = { ...replacements, ...newReplacements };
      },
      rawData,
    });
    return { pageContent, metadata: {} };
  });

  return { anonymizedAlerts, replacements };
};

export const renderAlert = (
  alert: AuditAlert,
  variant: AuditInputVariant,
  seed: string = 'render-alert'
): AnonymizedAlert => renderAlerts([alert], variant, seed).anonymizedAlerts[0];

/** Maps anonymization tokens in text back to the original values, with the product helper. */
export const deanonymize = (text: string, replacements: Replacements): string =>
  replaceAnonymizedValuesWithOriginalValues({ messageContent: text, replacements });
