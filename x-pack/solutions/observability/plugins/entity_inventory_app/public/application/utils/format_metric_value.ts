/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicMetricUnit, ESQLValue } from '@kbn/entity-inventory-plugin/common';

const formatPlainNumber = (value: number): string =>
  value.toLocaleString('en', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 3,
  });

const BYTE_UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'] as const;

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes === 0) {
    return `${formatPlainNumber(bytes)} B`;
  }
  const power = Math.min(
    Math.floor(Math.log(Math.abs(bytes)) / Math.log(1000)),
    BYTE_UNITS.length - 1
  );
  if (power < 1) {
    return `${formatPlainNumber(bytes)} B`;
  }
  return `${formatPlainNumber(bytes / 1000 ** power)} ${BYTE_UNITS[power]}`;
};

const asNumber = (value: ESQLValue): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/**
 * Formats a metric cell for the inventory list. Returns `null` when there is no value to show
 * (caller renders N/A). Without a unit, falls back to a plain number string.
 */
export const formatMetricValue = (
  value: ESQLValue | undefined,
  unit: DynamicMetricUnit | undefined
): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  // Metrics are scalar aggregates; an empty or null-only array is treated as missing.
  if (Array.isArray(value)) {
    return null;
  }

  const number = asNumber(value);
  if (number === null) {
    return String(value);
  }
  if (unit === undefined) {
    return formatPlainNumber(number);
  }

  switch (unit) {
    case 'percent':
      return `${formatPlainNumber(number * 100)}%`;
    case 'ratio':
      return formatPlainNumber(number);
    case 'bytes':
      return formatBytes(number);
    case 'ms':
      return `${formatPlainNumber(number)}ms`;
    case 's':
      return `${formatPlainNumber(number)}s`;
    case 'count':
      return formatPlainNumber(number);
    default: {
      const _exhaustive: never = unit;
      return formatPlainNumber(_exhaustive);
    }
  }
};
