/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { createSeveritySync } from './sync_severity';

const mockLoadInvestigationOutcomes = jest.fn();
jest.mock('./investigation_outcome', () => ({
  loadInvestigationOutcomes: (...args: unknown[]) => mockLoadInvestigationOutcomes(...args),
}));

const log = { warn: jest.fn(), debug: jest.fn() };
const logger = { get: () => log } as unknown as Logger;
const request = {} as KibanaRequest;

interface Row {
  event_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status?: string;
}
type Outcome = 'updated' | 'unchanged' | 'superseded' | 'not_found' | 'closed';

const available = (entries: Array<[string, Row['severity']]>) => ({
  status: 'available',
  outcomes: new Map(
    entries.map(([eventId, severity]) => [
      eventId,
      { severity, episodeId: `episode-of-${eventId}` },
    ])
  ),
});
const unavailable = (reason: string) => ({ status: 'unavailable', reason });
const staleRows = (prefix: string, count: number): Row[] =>
  Array.from({ length: count }, (_, index) => ({
    event_id: `${prefix}-${index}`,
    severity: 'low',
  }));

const setup = (syncSeverity: jest.Mock = jest.fn().mockResolvedValue('updated' as Outcome)) => {
  const eventClient = {
    findCurrentEpisodeIdsByEventIds: jest.fn(),
    findEventIdsByEpisodeIds: jest.fn(),
    syncSeverity,
  };
  const severitySync = createSeveritySync({ getAgenticInvestigations: () => undefined, logger });
  return {
    severitySync,
    syncSeverity,
    eventClient,
    reconcile: (rows: Row[]) => severitySync.reconcileRows({ rows, request, eventClient }),
  };
};

const flush = () => jest.advanceTimersByTimeAsync(0);

describe('createSeveritySync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-11-10T10:00:00.000Z'));
  });
  afterEach(() => jest.useRealTimers());

  describe('reconcileRows', () => {
    it('gives each row the severity its investigation concluded and never writes', async () => {
      mockLoadInvestigationOutcomes.mockResolvedValue(
        available([
          ['event-1', 'critical'],
          ['event-2', 'low'],
        ])
      );
      const { reconcile, syncSeverity } = setup();

      const rows = await reconcile([
        { event_id: 'event-1', severity: 'high' },
        { event_id: 'event-2', severity: 'low' },
        { event_id: 'event-3', severity: 'high' },
      ]);
      await flush();

      expect(rows.map(({ severity }) => severity)).toEqual(['critical', 'low', 'high']);
      expect(syncSeverity).not.toHaveBeenCalled();
    });

    it('keeps the stored severity of a reopened event whose only investigation is on an earlier episode', async () => {
      // The loader reads the current episode only, so an earlier episode's investigation is no outcome.
      mockLoadInvestigationOutcomes.mockResolvedValue(available([]));
      const { reconcile } = setup();

      const rows = await reconcile([
        { event_id: 'event-1', severity: 'high', status: ALERT_EPISODE_STATUS.ACTIVE },
      ]);

      expect(rows.map(({ severity }) => severity)).toEqual(['high']);
    });

    it('keeps the stored severity of a closed event and does not read its investigation', async () => {
      mockLoadInvestigationOutcomes.mockResolvedValue(
        available([
          ['event-1', 'critical'],
          ['event-2', 'critical'],
        ])
      );
      const { reconcile } = setup();

      const rows = await reconcile([
        { event_id: 'event-1', severity: 'low', status: ALERT_EPISODE_STATUS.INACTIVE },
        { event_id: 'event-2', severity: 'low', status: ALERT_EPISODE_STATUS.ACTIVE },
      ]);

      expect(rows.map(({ severity }) => severity)).toEqual(['low', 'critical']);
      expect(mockLoadInvestigationOutcomes).toHaveBeenCalledWith(
        expect.objectContaining({ eventIds: ['event-2'] })
      );
    });

    it.each(['forbidden', 'timeout', 'error', 'not_installed'])(
      'keeps the stored severities and writes nothing while the investigations are unavailable (%s)',
      async (reason) => {
        mockLoadInvestigationOutcomes.mockResolvedValue(unavailable(reason));
        const { reconcile, syncSeverity } = setup();
        const rows = staleRows('kept', 2);

        expect(await reconcile(rows)).toEqual(rows);
        await flush();

        expect(syncSeverity).not.toHaveBeenCalled();
      }
    );

    it('never writes for inactive events or when a write would fail', async () => {
      mockLoadInvestigationOutcomes.mockResolvedValue(
        available([
          ['event-1', 'critical'],
          ['event-2', 'low'],
        ])
      );
      const { reconcile, syncSeverity } = setup(jest.fn().mockRejectedValue(new Error('boom')));

      await reconcile([
        { event_id: 'event-1', severity: 'low', status: 'inactive' },
        { event_id: 'event-2', severity: 'high' },
      ] as Row[]);
      await flush();

      expect(syncSeverity).not.toHaveBeenCalled();
    });

    it('warns once per reason every 5 minutes, and not for a missing plugin or a forbidden read', async () => {
      const { reconcile } = setup();
      const openRows: Row[] = [{ event_id: 'event-1', severity: 'low' }];
      mockLoadInvestigationOutcomes.mockResolvedValue(unavailable('error'));
      await reconcile(openRows);
      await reconcile(openRows);
      expect(log.warn).toHaveBeenCalledTimes(1);

      // Another reason has its own window.
      mockLoadInvestigationOutcomes.mockResolvedValue(unavailable('timeout'));
      await reconcile(openRows);
      expect(log.warn).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(5 * 60_000 + 1);
      mockLoadInvestigationOutcomes.mockResolvedValue(unavailable('error'));
      await reconcile(openRows);
      expect(log.warn).toHaveBeenCalledTimes(3);

      for (const reason of ['not_installed', 'forbidden']) {
        mockLoadInvestigationOutcomes.mockResolvedValue(unavailable(reason));
        await reconcile(openRows);
      }
      expect(log.warn).toHaveBeenCalledTimes(3);
    });
  });

  describe('syncEvents', () => {
    it('writes the severity the investigation concluded for each event and returns what it gave', async () => {
      const outcome = available([
        ['event-1', 'high'],
        ['event-9', 'low'],
      ]);
      mockLoadInvestigationOutcomes.mockResolvedValue(outcome);
      const { severitySync, syncSeverity, eventClient } = setup();

      const result = await severitySync.syncEvents({
        request,
        eventClient,
        eventIds: ['event-1', 'event-9'],
      });

      expect(result).toBe(outcome);
      expect(syncSeverity).toHaveBeenCalledWith({
        eventId: 'event-1',
        severity: 'high',
        episodeId: 'episode-of-event-1',
      });
      expect(syncSeverity).toHaveBeenCalledWith({
        eventId: 'event-9',
        severity: 'low',
        episodeId: 'episode-of-event-9',
      });
    });

    it('writes nothing for a reopened event whose only investigation is on an earlier episode', async () => {
      mockLoadInvestigationOutcomes.mockResolvedValue(available([]));
      const { severitySync, syncSeverity, eventClient } = setup();

      await severitySync.syncEvents({ request, eventClient, eventIds: ['event-1'] });

      expect(syncSeverity).not.toHaveBeenCalled();
    });

    it('tries every event when one write fails, then throws that error', async () => {
      mockLoadInvestigationOutcomes.mockResolvedValue(
        available([
          ['event-1', 'high'],
          ['event-2', 'low'],
        ])
      );
      const syncSeverity = jest
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValue('updated');
      const { severitySync, eventClient } = setup(syncSeverity);

      await expect(
        severitySync.syncEvents({ request, eventClient, eventIds: ['event-1', 'event-2'] })
      ).rejects.toThrow('boom');

      expect(syncSeverity).toHaveBeenCalledWith({
        eventId: 'event-2',
        severity: 'low',
        episodeId: 'episode-of-event-2',
      });
    });

    it('writes nothing and returns the reason when the investigations are unavailable', async () => {
      mockLoadInvestigationOutcomes.mockResolvedValue(unavailable('timeout'));
      const { severitySync, syncSeverity, eventClient } = setup();

      const result = await severitySync.syncEvents({
        request,
        eventClient,
        eventIds: ['event-1'],
      });

      expect(result).toEqual(unavailable('timeout'));
      expect(syncSeverity).not.toHaveBeenCalled();
    });
  });

  describe('resolveSeverities', () => {
    const events = [
      { eventId: 'event-1', storedSeverity: 'low' as const },
      { eventId: 'event-2', storedSeverity: 'medium' as const },
    ];
    const resolve = () => {
      const { severitySync, eventClient } = setup();
      return severitySync.resolveSeverities({ request, eventClient, events });
    };

    it("resolves the severity of each event's investigation, and leaves the others out", async () => {
      mockLoadInvestigationOutcomes.mockResolvedValue(available([['event-1', 'critical']]));

      expect(await resolve()).toEqual(new Map([['event-1', 'critical']]));
    });

    it('resolves the stored severities, and warns once with the reason, while the investigations cannot be read', async () => {
      mockLoadInvestigationOutcomes.mockResolvedValue(unavailable('timeout'));

      expect(await resolve()).toEqual(
        new Map([
          ['event-1', 'low'],
          ['event-2', 'medium'],
        ])
      );
      expect(log.warn).toHaveBeenCalledTimes(1);
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('(timeout)'));
    });

    it('resolves nothing, and does not warn, without the investigations plugin', async () => {
      mockLoadInvestigationOutcomes.mockResolvedValue(unavailable('not_installed'));

      expect(await resolve()).toEqual(new Map());
      expect(log.warn).not.toHaveBeenCalled();
    });
  });
});
