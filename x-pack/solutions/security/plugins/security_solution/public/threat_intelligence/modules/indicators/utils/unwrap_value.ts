/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type IndicatorLike = Record<'fields', Record<string, unknown>> | null | undefined;

/**
 * Unpacks field value from raw indicator fields. Will return null if fields are missing entirely
 * or there is no record for given `fieldId`
 */
export const unwrapValue = (
  indicator: IndicatorLike,
  fieldId: string
): string | string[] | null => {
  if (!indicator) {
    return null;
  }

  const raw = indicator.fields?.[fieldId];

  // Handle string directly
  if (typeof raw === 'string') {
    return raw;
  }

  // Handle arrays by collecting only strings
  if (Array.isArray(raw)) {
    const strings = raw.filter((v): v is string => typeof v === 'string');

    if (strings.length === 0) return null;
    if (strings.length === 1) return strings[0];

    // Multiple string values -> return array so callers can OR them
    return strings;
  }

  // Any other type -> unsupported
  return null;
};
