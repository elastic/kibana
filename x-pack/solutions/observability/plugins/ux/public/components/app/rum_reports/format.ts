/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const formatReportMs = (ms: number | null | undefined): string => {
  if (ms == null || !Number.isFinite(ms)) {
    return '—';
  }
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
};

export const formatReportCount = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 10_000) {
    return `${Math.round(value / 1000)}k`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return String(Math.round(value));
};

export const formatReportRate = (ratio: number | null | undefined): string => {
  if (ratio == null || !Number.isFinite(ratio)) {
    return '—';
  }
  return `${Math.round(ratio * 1000) / 10}%`;
};

export const formatReportDate = (raw: string | null | undefined): string => {
  if (!raw) {
    return '—';
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
