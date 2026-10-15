/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { AlertStatusConfigs } from '../../../../common/runtime_types/alert_rules/common';
import { calculateIsValidPing, getPendingConfigs } from './helpers';

describe('helpers', () => {
  describe('getPendingConfigs', () => {
    const logger = loggerMock.create();

    const makeMonitorSO = (
      soId: string,
      monitorQueryId: string,
      name: string,
      locationIds: string[] = ['loc-1']
    ) => ({
      id: soId,
      type: 'synthetics-monitor' as const,
      score: 1,
      attributes: {
        id: monitorQueryId,
        name,
        type: 'http',
        config_id: soId,
        locations: locationIds.map((id) => ({ id, label: `Label ${id}` })),
        tags: [],
        labels: {},
      },
      created_at: '2020-01-01T00:00:00.000Z',
      references: [],
    });

    it('uses configId (SO UUID) for keys, not monitorQueryId, for project monitors', () => {
      const soId = 'so-uuid-123';
      const journeyId = 'my-project-my-monitor';
      const locationId = 'us-east';

      const monitors = [makeMonitorSO(soId, journeyId, 'Project Mon', [locationId])];

      const downConfigs = {
        [`${soId}-${locationId}`]: {
          configId: soId,
          monitorQueryId: journeyId,
          locationId,
          status: 'down',
          timestamp: '2025-01-01T00:00:00.000Z',
          latestPing: {},
          checks: { downWithinXChecks: 1, down: 1 },
        },
      } as unknown as AlertStatusConfigs;

      const result = getPendingConfigs({
        monitorQueryIds: [journeyId],
        monitorLocationIds: [locationId],
        upConfigs: {},
        downConfigs,
        monitorsData: {
          [journeyId]: { scheduleInMs: 60000, locations: [locationId], type: 'http' },
        },
        monitors: monitors as any,
        logger,
      });

      // Should NOT be pending because down config with SO-UUID key exists
      expect(result).toEqual({});
    });

    it('creates pending config with SO UUID as configId for project monitors', () => {
      const soId = 'so-uuid-456';
      const journeyId = 'my-project-monitor-2';
      const locationId = 'us-west';

      const monitors = [makeMonitorSO(soId, journeyId, 'Project Mon 2', [locationId])];

      const result = getPendingConfigs({
        monitorQueryIds: [journeyId],
        monitorLocationIds: [locationId],
        upConfigs: {},
        downConfigs: {},
        monitorsData: {
          [journeyId]: { scheduleInMs: 60000, locations: [locationId], type: 'http' },
        },
        monitors: monitors as any,
        logger,
      });

      // Key should use SO UUID, not journey ID
      expect(result[`${soId}-${locationId}`]).toBeDefined();
      expect(result[`${journeyId}-${locationId}`]).toBeUndefined();
      expect(result[`${soId}-${locationId}`].configId).toBe(soId);
      expect(result[`${soId}-${locationId}`].monitorQueryId).toBe(journeyId);
    });

    it('works correctly for regular monitors where configId === monitorQueryId', () => {
      const monitorId = 'regular-monitor-id';
      const locationId = 'eu-west';

      const monitors = [makeMonitorSO(monitorId, monitorId, 'Regular Mon', [locationId])];

      const result = getPendingConfigs({
        monitorQueryIds: [monitorId],
        monitorLocationIds: [locationId],
        upConfigs: {},
        downConfigs: {},
        monitorsData: {
          [monitorId]: { scheduleInMs: 60000, locations: [locationId], type: 'http' },
        },
        monitors: monitors as any,
        logger,
      });

      expect(result[`${monitorId}-${locationId}`]).toBeDefined();
      expect(result[`${monitorId}-${locationId}`].configId).toBe(monitorId);
    });
  });

  describe('calculateIsValidPing', () => {
    // Store the original Date implementation
    const originalDate = global.Date;

    // Mock the current time to be fixed for tests
    const mockCurrentTime = new Date('2025-06-09T10:00:00.000Z').getTime();

    beforeEach(() => {
      // Mock Date to return fixed time for Date.now() and new Date()
      global.Date = class extends Date {
        constructor(...args: Parameters<typeof Date>) {
          if (args.length === 0) {
            super(mockCurrentTime);
          } else {
            super(...args);
          }
        }

        static now() {
          return mockCurrentTime;
        }
      } as any;
    });

    afterEach(() => {
      // Restore original Date implementation
      global.Date = originalDate;
    });

    it('should return true when ping is within schedule + buffer time', () => {
      // Ping was 2 minutes ago, schedule is 5 minutes, buffer is 1 minute (default)
      // Total allowed time: 5 + 1 = 6 minutes
      // 2 minutes < 6 minutes, so ping is valid
      const twoMinutesAgo = new Date(mockCurrentTime - 2 * 60 * 1000).toISOString();

      const result = calculateIsValidPing({
        previousRunEndTimeISO: twoMinutesAgo,
        scheduleInMs: 5 * 60 * 1000, // 5 minutes
      });

      expect(result).toBe(true);
    });

    it('should return false when ping is older than schedule + buffer time', () => {
      // Ping was 7 minutes ago, schedule is 5 minutes, buffer is 1 minute (default)
      // Total allowed time: 5 + 1 = 6 minutes
      // 7 minutes > 6 minutes, so ping is invalid/stale
      const sevenMinutesAgo = new Date(mockCurrentTime - 7 * 60 * 1000).toISOString();

      const result = calculateIsValidPing({
        previousRunEndTimeISO: sevenMinutesAgo,
        scheduleInMs: 5 * 60 * 1000, // 5 minutes
      });

      expect(result).toBe(false);
    });

    it('should respect custom buffer time', () => {
      // Ping was 7 minutes ago, schedule is 5 minutes, custom buffer is 3 minutes
      // Total allowed time: 5 + 3 = 8 minutes
      // 7 minutes < 8 minutes, so ping is valid
      const sevenMinutesAgo = new Date(mockCurrentTime - 7 * 60 * 1000).toISOString();

      const result = calculateIsValidPing({
        previousRunEndTimeISO: sevenMinutesAgo,
        scheduleInMs: 5 * 60 * 1000, // 5 minutes
        minimumTotalBufferMs: 3 * 60 * 1000, // 3 minutes
      });

      expect(result).toBe(true);
    });

    it('should handle very long previousRunDurationUs', () => {
      // Ping was 10 minutes ago, schedule is 5 minutes
      // Previous run duration is 6 minutes (360,000,000 microseconds)
      // Total allowed time: 5 + 6 = 11 minutes
      // 10 minutes < 11 minutes, so ping is valid
      const tenMinutesAgo = new Date(mockCurrentTime - 10 * 60 * 1000).toISOString();

      const result = calculateIsValidPing({
        previousRunEndTimeISO: tenMinutesAgo,
        scheduleInMs: 5 * 60 * 1000, // 5 minutes
        previousRunDurationUs: 6 * 60 * 1000 * 1000, // 6 minutes in microseconds
      });

      expect(result).toBe(true);
    });
  });
});
