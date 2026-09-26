/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FP_TP_BASE_TIME } from './constants';
import type { FpTpTwin } from './types';

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

const formatShiftedIso = (next: Date, original: string): string => {
  const iso = next.toISOString();
  if (original.endsWith('.000Z') || !original.includes('.')) {
    return iso.replace(/\.\d{3}Z$/, '.000Z');
  }
  return iso;
};

const shiftValue = (value: unknown, deltaMs: number): unknown => {
  if (typeof value === 'string' && ISO_TIMESTAMP.test(value)) {
    return formatShiftedIso(new Date(Date.parse(value) + deltaMs), value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => shiftValue(item, deltaMs));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, shiftValue(nested, deltaMs)])
    );
  }
  return value;
};

/**
 * Moves a frozen twin's ISO timestamps forward so `now-24h` UI queries still see it.
 */
export const shiftTwinToNow = (twin: FpTpTwin, now: Date): FpTpTwin => {
  const deltaMs = now.getTime() - FP_TP_BASE_TIME.getTime();
  return shiftValue(twin, deltaMs) as FpTpTwin;
};
