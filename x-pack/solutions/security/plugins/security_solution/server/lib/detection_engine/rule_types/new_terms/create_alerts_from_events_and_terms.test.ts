/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkCreate } from '../factories';
import { bulkCreateSuppressedNewTermsAlertsInMemory } from './bulk_create_suppressed_alerts_in_memory';
import { wrapNewTermsAlerts } from './wrap_new_terms_alerts';
import {
  createSearchAfterReturnType,
  getMaxSignalsWarning,
  getSuppressionMaxSignalsWarning,
} from '../utils/utils';
import type { EventsAndTerms } from './types';
import { createAlertsFromEventsAndTerms } from './create_alerts_from_events_and_terms';

jest.mock('../factories', () => ({ bulkCreate: jest.fn() }));
jest.mock('./bulk_create_suppressed_alerts_in_memory', () => ({
  bulkCreateSuppressedNewTermsAlertsInMemory: jest.fn(),
}));
jest.mock('./wrap_new_terms_alerts', () => ({ wrapNewTermsAlerts: jest.fn(() => []) }));

const bulkCreateMock = bulkCreate as jest.Mock;
const bulkCreateSuppressedMock = bulkCreateSuppressedNewTermsAlertsInMemory as jest.Mock;
const wrapNewTermsAlertsMock = wrapNewTermsAlerts as jest.Mock;

const bulkResponse = (alertsWereTruncated: boolean) => ({
  errors: [],
  success: true,
  enrichmentDuration: '0',
  bulkCreateDuration: '0',
  createdItemsCount: 1,
  createdItems: [],
  alertsWereTruncated,
});

const buildEventsAndTerms = (count: number): EventsAndTerms[] =>
  Array.from({ length: count }, (_, i) => ({
    event: { _id: `id-${i}`, _index: 'logs' },
    newTerms: [`host-${i}`],
  })) as unknown as EventsAndTerms[];

const baseArgs = (overrides: { maxSignals: number; alertSuppression?: unknown }) => ({
  sharedParams: {} as never,
  services: {} as never,
  result: createSearchAfterReturnType(),
  params: {
    maxSignals: overrides.maxSignals,
    alertSuppression: overrides.alertSuppression,
  } as never,
});

describe('createAlertsFromEventsAndTerms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wraps and bulk-creates when suppression is not active', async () => {
    bulkCreateMock.mockResolvedValue(bulkResponse(false));
    const args = baseArgs({ maxSignals: 100 });

    const { alertsWereTruncated } = await createAlertsFromEventsAndTerms({
      ...args,
      eventsAndTerms: buildEventsAndTerms(3),
      isAlertSuppressionActive: false,
    });

    expect(wrapNewTermsAlertsMock).toHaveBeenCalledTimes(1);
    expect(bulkCreateMock).toHaveBeenCalledTimes(1);
    expect(bulkCreateSuppressedMock).not.toHaveBeenCalled();
    expect(alertsWereTruncated).toBe(false);
    expect(args.result.warningMessages).toHaveLength(0);
  });

  it('uses the suppressed bulk-create path when suppression is active', async () => {
    bulkCreateSuppressedMock.mockResolvedValue(bulkResponse(false));
    const args = baseArgs({ maxSignals: 100, alertSuppression: { groupBy: ['host.name'] } });

    await createAlertsFromEventsAndTerms({
      ...args,
      eventsAndTerms: buildEventsAndTerms(3),
      isAlertSuppressionActive: true,
    });

    expect(bulkCreateSuppressedMock).toHaveBeenCalledTimes(1);
    expect(bulkCreateMock).not.toHaveBeenCalled();
    expect(wrapNewTermsAlertsMock).not.toHaveBeenCalled();
  });

  it('pushes the max-signals warning and stops paging when alerts are truncated', async () => {
    bulkCreateMock.mockResolvedValue(bulkResponse(true));
    // maxSignals 1 -> chunk size 5, so 10 events => 2 chunks; truncation on the first must break
    const args = baseArgs({ maxSignals: 1 });

    const { alertsWereTruncated } = await createAlertsFromEventsAndTerms({
      ...args,
      eventsAndTerms: buildEventsAndTerms(10),
      isAlertSuppressionActive: false,
    });

    expect(alertsWereTruncated).toBe(true);
    expect(bulkCreateMock).toHaveBeenCalledTimes(1);
    expect(args.result.warningMessages).toEqual([getMaxSignalsWarning()]);
  });

  it('pushes the suppression-specific warning when truncated under suppression', async () => {
    bulkCreateSuppressedMock.mockResolvedValue(bulkResponse(true));
    const args = baseArgs({ maxSignals: 1, alertSuppression: { groupBy: ['host.name'] } });

    await createAlertsFromEventsAndTerms({
      ...args,
      eventsAndTerms: buildEventsAndTerms(10),
      isAlertSuppressionActive: true,
    });

    expect(args.result.warningMessages).toEqual([getSuppressionMaxSignalsWarning()]);
  });
});
