/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Default Elasticsearch index patterns for each SLO indicator type.
 * Used as a client-side safety net when AI-generated definitions omit the
 * required `index` field.
 */
export const DEFAULT_INDEX_BY_TYPE: Record<string, string> = {
  'sli.apm.transactionDuration': 'metrics-apm*',
  'sli.apm.transactionErrorRate': 'metrics-apm*',
  'sli.kql.custom': 'logs-*',
  'sli.metric.custom': 'metrics-*',
  'sli.metric.timeslice': 'metrics-*',
  'sli.histogram.custom': 'metrics-*',
  'sli.synthetics.availability': 'synthetics-*',
};

/**
 * Converts a value to a duration string (e.g. "1m", "5m").
 * The SLO schema expects duration strings, but the LLM may generate numbers.
 */
export function toDurationString(value: unknown): string {
  if (typeof value === 'string' && /^\d+[smhdwMy]$/.test(value)) {
    return value;
  }
  if (typeof value === 'number') {
    return `${value}m`;
  }
  return '1m';
}

/**
 * Ensures the indicator params contain a valid `index` field and fills in
 * required APM-specific defaults when missing.
 */
export function ensureIndicatorIndex(
  indicator: { type?: string; params?: Record<string, unknown> } | undefined
): { type?: string; params?: Record<string, unknown> } | undefined {
  if (!indicator?.type || !indicator.params) return indicator;

  const params = { ...indicator.params };

  if (!params.index && DEFAULT_INDEX_BY_TYPE[indicator.type]) {
    params.index = DEFAULT_INDEX_BY_TYPE[indicator.type];
  }

  if (
    indicator.type === 'sli.apm.transactionErrorRate' ||
    indicator.type === 'sli.apm.transactionDuration'
  ) {
    if (!params.transactionName) params.transactionName = '*';
    if (!params.environment) params.environment = '*';
    if (!params.transactionType) params.transactionType = 'request';
    if (!params.service) params.service = '*';
  }

  if (indicator.type === 'sli.kql.custom' && !params.timestampField) {
    params.timestampField = '@timestamp';
  }

  return { ...indicator, params };
}

/**
 * Normalizes AI-generated SLO definitions to match the CreateSLOParams schema
 * expected by the create SLO API, stripping any extra fields the LLM may include.
 */
export function normalizeForCreate(
  sloDefinition: Record<string, unknown>
): Record<string, unknown> {
  const {
    name,
    description,
    indicator,
    timeWindow,
    budgetingMethod,
    objective,
    tags,
    groupBy,
    settings,
    id,
  } = sloDefinition;

  const normalizedIndicator = ensureIndicatorIndex(
    indicator as { type?: string; params?: Record<string, unknown> } | undefined
  );

  const normalized: Record<string, unknown> = {
    name: name ?? 'Untitled SLO',
    description: description ?? '',
    indicator: normalizedIndicator ?? indicator,
    timeWindow,
    budgetingMethod: budgetingMethod ?? 'occurrences',
    objective,
  };

  if (id) {
    normalized.id = id;
  }

  if (tags && Array.isArray(tags) && tags.length > 0) {
    normalized.tags = tags;
  }

  if (groupBy && groupBy !== '*') {
    normalized.groupBy = groupBy;
  }

  if (settings && typeof settings === 'object') {
    const { preventInitialBackfill, syncDelay, frequency, syncField } = settings as Record<
      string,
      unknown
    >;
    const normalizedSettings: Record<string, unknown> = {};
    if (typeof preventInitialBackfill === 'boolean') {
      normalizedSettings.preventInitialBackfill = preventInitialBackfill;
    }
    if (syncDelay !== undefined && syncDelay !== null) {
      normalizedSettings.syncDelay = toDurationString(syncDelay);
    }
    if (frequency !== undefined && frequency !== null) {
      normalizedSettings.frequency = toDurationString(frequency);
    }
    if (syncField && typeof syncField === 'string') {
      normalizedSettings.syncField = syncField;
    }
    if (Object.keys(normalizedSettings).length > 0) {
      normalized.settings = normalizedSettings;
    }
  }

  return normalized;
}
