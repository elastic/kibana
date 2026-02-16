/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Default Elasticsearch index patterns for each SLO indicator type.
 * These are injected when the LLM omits the required `index` field.
 */
export const DEFAULT_INDEX_BY_INDICATOR_TYPE: Record<string, string> = {
  'sli.apm.transactionDuration': 'metrics-apm*',
  'sli.apm.transactionErrorRate': 'metrics-apm*',
  'sli.kql.custom': 'logs-*',
  'sli.metric.custom': 'metrics-*',
  'sli.metric.timeslice': 'metrics-*',
  'sli.histogram.custom': 'metrics-*',
  'sli.synthetics.availability': 'synthetics-*',
};

/**
 * Converts a value to a valid SLO duration string (e.g. "1m", "5m").
 * The LLM may return numbers instead of duration strings.
 */
export function toDurationString(value: unknown, defaultValue: string): string {
  if (typeof value === 'string' && /^\d+[smhdwMy]$/.test(value)) {
    return value;
  }
  if (typeof value === 'number') {
    return `${value}m`;
  }
  return defaultValue;
}

/**
 * Ensures the indicator.params.index field is always set.
 * The schema requires it for all indicator types, but the LLM often omits it.
 * Also fills in required APM-specific fields with safe defaults.
 */
export function normalizeIndicatorIndex(normalized: Record<string, unknown>): void {
  const indicator = normalized.indicator as
    | { type?: string; params?: Record<string, unknown> }
    | undefined;

  if (!indicator?.params || !indicator.type) return;

  if (!indicator.params.index) {
    const defaultIndex = DEFAULT_INDEX_BY_INDICATOR_TYPE[indicator.type];
    if (defaultIndex) {
      indicator.params.index = defaultIndex;
    }
  }

  if (
    indicator.type === 'sli.apm.transactionErrorRate' ||
    indicator.type === 'sli.apm.transactionDuration'
  ) {
    if (!indicator.params.transactionName) {
      indicator.params.transactionName = '*';
    }
    if (!indicator.params.environment) {
      indicator.params.environment = '*';
    }
    if (!indicator.params.transactionType) {
      indicator.params.transactionType = 'request';
    }
    if (!indicator.params.service) {
      indicator.params.service = '*';
    }
  }

  if (indicator.type === 'sli.kql.custom') {
    if (!indicator.params.timestampField) {
      indicator.params.timestampField = '@timestamp';
    }
  }
}

/**
 * Normalizes an AI-generated SLO definition to comply with the SLO schema.
 *
 * This handles common LLM output issues:
 * - Missing `auto-discovered` tag
 * - Missing `groupBy` default
 * - Numeric values where duration strings are expected
 * - Missing indicator index and required APM fields
 */
export function normalizeSloDefinition(
  definition: Record<string, unknown>
): Record<string, unknown> {
  const normalized = { ...definition };

  if (!normalized.tags) {
    normalized.tags = ['auto-discovered'];
  } else if (
    Array.isArray(normalized.tags) &&
    !normalized.tags.includes('auto-discovered')
  ) {
    (normalized.tags as string[]).push('auto-discovered');
  }

  if (!normalized.groupBy) {
    normalized.groupBy = '*';
  }

  if (normalized.settings && typeof normalized.settings === 'object') {
    const settings = normalized.settings as Record<string, unknown>;
    normalized.settings = {
      ...(settings.preventInitialBackfill !== undefined
        ? { preventInitialBackfill: settings.preventInitialBackfill }
        : {}),
      ...(settings.syncDelay !== undefined
        ? { syncDelay: toDurationString(settings.syncDelay, '1m') }
        : {}),
      ...(settings.frequency !== undefined
        ? { frequency: toDurationString(settings.frequency, '1m') }
        : {}),
      ...(settings.syncField !== undefined ? { syncField: settings.syncField } : {}),
    };
  }

  normalizeIndicatorIndex(normalized);

  return normalized;
}
