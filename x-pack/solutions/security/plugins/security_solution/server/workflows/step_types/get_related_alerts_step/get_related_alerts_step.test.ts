/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindRelatedAlertsResult } from '../../../lib/alert_analysis/services/find_related_alerts';

jest.mock('../../../lib/alert_analysis/services/find_related_alerts', () => ({
  findRelatedAlerts: jest.fn(),
}));

import { findRelatedAlerts } from '../../../lib/alert_analysis/services/find_related_alerts';
import { getRelatedAlertsStepDefinition } from './get_related_alerts_step';
import { getRelatedAlertsInputSchema } from '../../../../common/workflows/step_types/get_related_alerts_step/get_related_alerts_step_common';

const mockFindRelatedAlerts = findRelatedAlerts as jest.MockedFunction<typeof findRelatedAlerts>;

const makeSuccess = (overrides: Partial<FindRelatedAlertsResult> = {}): FindRelatedAlertsResult =>
  ({
    ok: true,
    message: 'Found 0 related alerts sharing entities with alert seed.',
    relatedAlerts: [],
    sourceEntities: { hostNames: [], userNames: [], sourceIps: [], destIps: [] },
    totalMatched: 0,
    returnedCount: 0,
    isTruncated: false,
    ...overrides,
  } as FindRelatedAlertsResult);

const createMockContext = (input: Record<string, unknown>) => ({
  input,
  config: {},
  rawInput: input,
  contextManager: {
    getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'default' } }),
    getScopedEsClient: jest.fn().mockReturnValue({ get: jest.fn(), search: jest.fn() }),
    renderInputTemplate: jest.fn(),
    getFakeRequest: jest.fn(),
  },
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  abortSignal: new AbortController().signal,
  stepId: 'test-step',
  stepType: 'security.alertAnalysis.getRelatedAlerts',
});

describe('getRelatedAlerts step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('input schema', () => {
    it('applies defaults for timeWindowHours and maxResults', () => {
      const parsed = getRelatedAlertsInputSchema.parse({
        alertId: 'alert-1',
        alertIndex: '.alerts-security.alerts-default',
      });
      expect(parsed.timeWindowHours).toBe(24);
      expect(parsed.maxResults).toBe(25);
    });

    it('coerces numeric strings (workflow YAML values often arrive as strings)', () => {
      const parsed = getRelatedAlertsInputSchema.parse({
        alertId: 'alert-1',
        alertIndex: '.alerts-security.alerts-default',
        timeWindowHours: '48',
        maxResults: '10',
      });
      expect(parsed.timeWindowHours).toBe(48);
      expect(parsed.maxResults).toBe(10);
    });

    it('rejects out-of-range timeWindowHours', () => {
      const result = getRelatedAlertsInputSchema.safeParse({
        alertId: 'alert-1',
        alertIndex: '.alerts-security.alerts-default',
        timeWindowHours: 200,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('handler', () => {
    it('delegates to findRelatedAlerts with the parsed input', async () => {
      mockFindRelatedAlerts.mockResolvedValue(
        makeSuccess({
          message: 'Found 1 related alerts sharing entities with alert seed-1.',
          relatedAlerts: [{ _id: 'rel-1', _index: '.alerts-security.alerts-default' }],
          sourceEntities: { hostNames: ['host-1'], userNames: [], sourceIps: [], destIps: [] },
          totalMatched: 1,
          returnedCount: 1,
          isTruncated: false,
        })
      );

      const input = getRelatedAlertsInputSchema.parse({
        alertId: 'seed-1',
        alertIndex: '.alerts-security.alerts-default',
      });
      const context = createMockContext(input);

      const result = await getRelatedAlertsStepDefinition.handler(context as never);

      expect(result.error).toBeUndefined();
      expect(result.output).toMatchObject({
        totalMatched: 1,
        returnedCount: 1,
        isTruncated: false,
        relatedAlerts: [{ _id: 'rel-1', _index: '.alerts-security.alerts-default' }],
      });
      // `ok` discriminator must NOT leak into the workflow output.
      expect((result.output as Record<string, unknown>).ok).toBeUndefined();
      expect(mockFindRelatedAlerts).toHaveBeenCalledWith(expect.anything(), {
        alertId: 'seed-1',
        alertsIndex: '.alerts-security.alerts-default',
        timeWindowHours: 24,
        maxResults: 25,
        hostNames: undefined,
        userNames: undefined,
        sourceIps: undefined,
        destIps: undefined,
      });
    });

    it('forwards optional entity arrays to the shared service when provided', async () => {
      mockFindRelatedAlerts.mockResolvedValue(makeSuccess());

      const input = getRelatedAlertsInputSchema.parse({
        alertId: 'seed-2',
        alertIndex: '.alerts-security.alerts-default',
        hostNames: ['win-srv01'],
        userNames: ['alice'],
        sourceIps: ['10.0.0.1'],
        destIps: ['10.0.0.2'],
        timeWindowHours: 48,
        maxResults: 10,
      });
      await getRelatedAlertsStepDefinition.handler(createMockContext(input) as never);

      expect(mockFindRelatedAlerts).toHaveBeenCalledWith(expect.anything(), {
        alertId: 'seed-2',
        alertsIndex: '.alerts-security.alerts-default',
        timeWindowHours: 48,
        maxResults: 10,
        hostNames: ['win-srv01'],
        userNames: ['alice'],
        sourceIps: ['10.0.0.1'],
        destIps: ['10.0.0.2'],
      });
    });

    it('returns the service error message when the service fails', async () => {
      mockFindRelatedAlerts.mockResolvedValue({
        ok: false,
        message: 'Alert seed-3 not found or has no source data.',
      });

      const input = getRelatedAlertsInputSchema.parse({
        alertId: 'seed-3',
        alertIndex: '.alerts-security.alerts-default',
      });
      const result = await getRelatedAlertsStepDefinition.handler(
        createMockContext(input) as never
      );

      expect(result.output).toBeUndefined();
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toContain('Alert seed-3 not found');
    });

    it('surfaces unexpected exceptions as a step error without throwing', async () => {
      mockFindRelatedAlerts.mockRejectedValue(new Error('ES connection refused'));

      const input = getRelatedAlertsInputSchema.parse({
        alertId: 'seed-4',
        alertIndex: '.alerts-security.alerts-default',
      });
      const result = await getRelatedAlertsStepDefinition.handler(
        createMockContext(input) as never
      );

      expect(result.output).toBeUndefined();
      expect((result.error as Error).message).toContain('ES connection refused');
    });
  });

  describe('common definition', () => {
    it('uses the canonical namespaced step type id', () => {
      expect(getRelatedAlertsStepDefinition.id).toBe('security.alertAnalysis.getRelatedAlerts');
    });
  });
});
