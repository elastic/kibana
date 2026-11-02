/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformRawData } from '@kbn/elastic-assistant-common';
import type { AnonymizedAlert } from '../types';
import { DEFAULT_ALLOWLIST, ENRICHED_FIELDS } from './default_allowlist';
import type { AuditAlert, AuditInputVariant } from './types';

const BASELINE_FIELDS: ReadonlySet<string> = new Set(DEFAULT_ALLOWLIST);
const ENRICHED_FIELD_SET: ReadonlySet<string> = new Set([...DEFAULT_ALLOWLIST, ...ENRICHED_FIELDS]);

export const getVariantFields = (variant: AuditInputVariant): ReadonlySet<string> =>
  variant === 'enriched' ? ENRICHED_FIELD_SET : BASELINE_FIELDS;

/**
 * Renders an alert the way product Attack Discovery does: `transformRawData` over the allowed
 * fields, producing one `field,value` line per field with keys sorted. Values are not replaced
 * with anonymization UUIDs, so evaluators can compare them to the entities a model cites.
 */
export const renderAlert = (alert: AuditAlert, variant: AuditInputVariant): AnonymizedAlert => {
  const allowed = getVariantFields(variant);
  const rawData: Record<string, unknown[]> = { _id: [alert.id] };
  for (const [field, value] of Object.entries(alert.fields)) {
    if (allowed.has(field)) {
      rawData[field] = [value];
    }
  }

  const pageContent = transformRawData({
    anonymizationFields: Array.from(allowed).map((field) => ({
      id: field,
      field,
      allowed: true,
      anonymized: false,
    })),
    currentReplacements: undefined,
    getAnonymizedValue: ({ rawValue }) => rawValue,
    rawData,
  });

  return { pageContent, metadata: {} };
};
