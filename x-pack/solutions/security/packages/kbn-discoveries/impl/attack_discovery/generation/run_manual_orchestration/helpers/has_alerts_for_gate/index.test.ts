/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import { hasAlertsForGate } from '.';

const mockCountGateScopeAlerts = jest.fn();

jest.mock('../../../count_gate_scope_alerts', () => ({
  countGateScopeAlerts: (...args: unknown[]) => mockCountGateScopeAlerts(...args),
}));

describe('hasAlertsForGate', () => {
  const esClient = {} as ElasticsearchClient;
  const logger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  const baseParams = {
    alertsIndexPattern: '.alerts-security.alerts-default',
    candidateCount: 0,
    end: 'now',
    esClient,
    executionUuid: 'test-execution-uuid',
    logger,
    skillEnabled: true,
    start: 'now-24h',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCountGateScopeAlerts.mockResolvedValue(0);
  });

  describe('when there are candidate alerts', () => {
    it('returns true', async () => {
      await expect(hasAlertsForGate({ ...baseParams, candidateCount: 3 })).resolves.toBe(true);
    });

    it('does not count alerts', async () => {
      await hasAlertsForGate({ ...baseParams, candidateCount: 3 });

      expect(mockCountGateScopeAlerts).not.toHaveBeenCalled();
    });
  });

  describe('when there are no candidates and the skill is disabled', () => {
    it('returns false', async () => {
      await expect(hasAlertsForGate({ ...baseParams, skillEnabled: false })).resolves.toBe(false);
    });

    it('does not count alerts', async () => {
      await hasAlertsForGate({ ...baseParams, skillEnabled: false });

      expect(mockCountGateScopeAlerts).not.toHaveBeenCalled();
    });

    it('logs why the gate is skipped', async () => {
      await hasAlertsForGate({ ...baseParams, skillEnabled: false });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('no candidate alerts and the skill is disabled')
      );
    });
  });

  describe('when there are no candidates and the skill is enabled', () => {
    it('counts with the run alerts index and time range', async () => {
      await hasAlertsForGate(baseParams);

      expect(mockCountGateScopeAlerts).toHaveBeenCalledWith({
        alertsIndexPattern: '.alerts-security.alerts-default',
        end: 'now',
        esClient,
        start: 'now-24h',
      });
    });

    it('returns false when no alerts are in scope', async () => {
      await expect(hasAlertsForGate(baseParams)).resolves.toBe(false);
    });

    it('logs why the gate is skipped when no alerts are in scope', async () => {
      await hasAlertsForGate(baseParams);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          "no open or acknowledged alerts in the run's time range or the last 7 days"
        )
      );
    });

    it('returns true when alerts are in scope', async () => {
      mockCountGateScopeAlerts.mockResolvedValue(4);

      await expect(hasAlertsForGate(baseParams)).resolves.toBe(true);
    });

    it('returns true when the count fails, so the gate still runs', async () => {
      mockCountGateScopeAlerts.mockRejectedValue(new Error('boom'));

      await expect(hasAlertsForGate(baseParams)).resolves.toBe(true);
    });

    it('logs a warning when the count fails', async () => {
      mockCountGateScopeAlerts.mockRejectedValue(new Error('boom'));

      await hasAlertsForGate(baseParams);

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
    });

    it('returns true without counting when no Elasticsearch client is available', async () => {
      await expect(hasAlertsForGate({ ...baseParams, esClient: undefined })).resolves.toBe(true);
      expect(mockCountGateScopeAlerts).not.toHaveBeenCalled();
    });
  });
});
