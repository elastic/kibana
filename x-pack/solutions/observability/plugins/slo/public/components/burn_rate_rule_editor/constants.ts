/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_ACTION,
  HIGH_PRIORITY_ACTION,
  LOW_PRIORITY_ACTION,
  MEDIUM_PRIORITY_ACTION,
} from '../../../common/constants';

import { WindowSchema } from '../../typings';

type PartialWindowSchema = Partial<WindowSchema>;

const WEEKLY: PartialWindowSchema[] = [
  {
    burnRateThreshold: 3.36,
    longWindow: { value: 1, unit: 'h' },
    shortWindow: { value: 5, unit: 'm' },
    actionGroup: ALERT_ACTION.id,
  },
  {
    burnRateThreshold: 1.4,
    longWindow: { value: 6, unit: 'h' },
    shortWindow: { value: 30, unit: 'm' },
    actionGroup: HIGH_PRIORITY_ACTION.id,
  },
  {
    burnRateThreshold: 0.7,
    longWindow: { value: 24, unit: 'h' },
    shortWindow: { value: 120, unit: 'm' },
    actionGroup: MEDIUM_PRIORITY_ACTION.id,
  },
  {
    burnRateThreshold: 0.234,
    longWindow: { value: 72, unit: 'h' },
    shortWindow: { value: 360, unit: 'm' },
    actionGroup: LOW_PRIORITY_ACTION.id,
  },
];

const MONTHLY: PartialWindowSchema[] = [
  {
    burnRateThreshold: 14.4,
    longWindow: { value: 1, unit: 'h' },
    shortWindow: { value: 5, unit: 'm' },
    actionGroup: ALERT_ACTION.id,
  },
  {
    burnRateThreshold: 6,
    longWindow: { value: 6, unit: 'h' },
    shortWindow: { value: 30, unit: 'm' },
    actionGroup: HIGH_PRIORITY_ACTION.id,
  },
  {
    burnRateThreshold: 3,
    longWindow: { value: 24, unit: 'h' },
    shortWindow: { value: 120, unit: 'm' },
    actionGroup: MEDIUM_PRIORITY_ACTION.id,
  },
  {
    burnRateThreshold: 1,
    longWindow: { value: 72, unit: 'h' },
    shortWindow: { value: 360, unit: 'm' },
    actionGroup: LOW_PRIORITY_ACTION.id,
  },
];

const QUARTERLY: PartialWindowSchema[] = [
  {
    burnRateThreshold: 43.2,
    longWindow: { value: 1, unit: 'h' },
    shortWindow: { value: 5, unit: 'm' },
    actionGroup: ALERT_ACTION.id,
  },
  {
    burnRateThreshold: 18,
    longWindow: { value: 6, unit: 'h' },
    shortWindow: { value: 30, unit: 'm' },
    actionGroup: HIGH_PRIORITY_ACTION.id,
  },
  {
    burnRateThreshold: 9,
    longWindow: { value: 24, unit: 'h' },
    shortWindow: { value: 120, unit: 'm' },
    actionGroup: MEDIUM_PRIORITY_ACTION.id,
  },
  {
    burnRateThreshold: 3,
    longWindow: { value: 72, unit: 'h' },
    shortWindow: { value: 360, unit: 'm' },
    actionGroup: LOW_PRIORITY_ACTION.id,
  },
];

export const BURN_RATE_DEFAULTS: Record<string, PartialWindowSchema[]> = {
  // Calendar Aligned
  '1M': MONTHLY,
  '1w': WEEKLY,
  '90d': QUARTERLY,
  '30d': MONTHLY,
  '7d': WEEKLY,
};
