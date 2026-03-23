/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ACTION_GROUP, ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import {
  ALERT_ACTION_ID,
  HIGH_PRIORITY_ACTION_ID,
  LOW_PRIORITY_ACTION_ID,
  MEDIUM_PRIORITY_ACTION_ID,
  SUPPRESSED_PRIORITY_ACTION_ID,
} from '../../../../common/constants';
import type { BurnRateAlert } from '../types';
import type { WindowSchema } from '../../../typings';
import { getActionGroupFromReason, getActionGroupWindow } from './alert';

const mockWindows: WindowSchema[] = [
  {
    id: '1',
    burnRateThreshold: 14.4,
    maxBurnRateThreshold: 720,
    longWindow: { value: 1, unit: 'h' },
    shortWindow: { value: 5, unit: 'm' },
    actionGroup: ALERT_ACTION_ID,
  },
  {
    id: '2',
    burnRateThreshold: 6,
    maxBurnRateThreshold: 720,
    longWindow: { value: 6, unit: 'h' },
    shortWindow: { value: 30, unit: 'm' },
    actionGroup: HIGH_PRIORITY_ACTION_ID,
  },
  {
    id: '3',
    burnRateThreshold: 3,
    maxBurnRateThreshold: 720,
    longWindow: { value: 24, unit: 'h' },
    shortWindow: { value: 120, unit: 'm' },
    actionGroup: MEDIUM_PRIORITY_ACTION_ID,
  },
  {
    id: '4',
    burnRateThreshold: 1,
    maxBurnRateThreshold: 720,
    longWindow: { value: 72, unit: 'h' },
    shortWindow: { value: 360, unit: 'm' },
    actionGroup: LOW_PRIORITY_ACTION_ID,
  },
];

const buildAlert = (actionGroup: string, reason: string): BurnRateAlert =>
  ({
    reason,
    start: Date.now(),
    lastUpdated: Date.now(),
    active: true,
    fields: {
      [ALERT_ACTION_GROUP]: actionGroup,
      [ALERT_RULE_PARAMETERS]: { sloId: 'test-slo', windows: mockWindows },
    },
  } as unknown as BurnRateAlert);

const CRITICAL_REASON =
  'CRITICAL: The burn rate for the past 1h is 89.88 and for the past 5m is 88. Alert when above 14.4 for both windows';
const HIGH_REASON =
  'HIGH: The burn rate for the past 6h is 7.23 and for the past 30m is 7.1. Alert when above 6 for both windows';
const MEDIUM_REASON =
  'MEDIUM: The burn rate for the past 24h is 4.1 and for the past 2h is 3.8. Alert when above 3 for both windows';
const LOW_REASON =
  'LOW: The burn rate for the past 72h is 1.5 and for the past 6h is 1.3. Alert when above 1 for both windows';

describe('getActionGroupFromReason', () => {
  it.each([
    [CRITICAL_REASON, ALERT_ACTION_ID],
    [HIGH_REASON, HIGH_PRIORITY_ACTION_ID],
    [MEDIUM_REASON, MEDIUM_PRIORITY_ACTION_ID],
    [LOW_REASON, LOW_PRIORITY_ACTION_ID],
    [`SUPPRESSED - ${CRITICAL_REASON}`, ALERT_ACTION_ID],
    [`SUPPRESSED - ${HIGH_REASON}`, HIGH_PRIORITY_ACTION_ID],
    [`SUPPRESSED - ${MEDIUM_REASON}`, MEDIUM_PRIORITY_ACTION_ID],
    [`SUPPRESSED - ${LOW_REASON}`, LOW_PRIORITY_ACTION_ID],
    ['', LOW_PRIORITY_ACTION_ID],
  ])('returns correct action group for "%s"', (reason, expected) => {
    expect(getActionGroupFromReason(reason)).toBe(expected);
  });
});

describe('getActionGroupWindow', () => {
  it.each([
    ['critical', ALERT_ACTION_ID, CRITICAL_REASON, mockWindows[0]],
    ['high', HIGH_PRIORITY_ACTION_ID, HIGH_REASON, mockWindows[1]],
    ['medium', MEDIUM_PRIORITY_ACTION_ID, MEDIUM_REASON, mockWindows[2]],
    ['low', LOW_PRIORITY_ACTION_ID, LOW_REASON, mockWindows[3]],
  ])('returns the correct window for a %s alert', (_, actionGroup, reason, expectedWindow) => {
    expect(getActionGroupWindow(buildAlert(actionGroup, reason))).toBe(expectedWindow);
  });

  it.each([
    ['critical', `SUPPRESSED - ${CRITICAL_REASON}`, mockWindows[0]],
    ['high', `SUPPRESSED - ${HIGH_REASON}`, mockWindows[1]],
    ['medium', `SUPPRESSED - ${MEDIUM_REASON}`, mockWindows[2]],
    ['low', `SUPPRESSED - ${LOW_REASON}`, mockWindows[3]],
  ])('returns the correct window for a suppressed %s alert', (_, reason, expectedWindow) => {
    expect(getActionGroupWindow(buildAlert(SUPPRESSED_PRIORITY_ACTION_ID, reason))).toBe(
      expectedWindow
    );
  });
});
