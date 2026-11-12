/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
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
}
type Outcome = 'updated' | 'unchanged' | 'superseded' | 'not_found';

const available = (entries: Array<[string, Row['severity']]>) => ({
  status: 'available',
  outcomes: new Map(entries.map(([eventId, severity]) => [eventId, { severity }])),
});
const unavailable = (reason: string) => ({ status: 'unavailable', reason });
const staleRows = (prefix: string, count: number): Row[] =>
  Array.from({ length: count }, (_, index) => ({
    event_id: `${prefix}-${index}`,
    severity: 'low',
  }));
const allCritical = (rows: Row[]) =>
  available(
    rows.map(({ event_id: eventId }) => [eventId, 'critical'] as [string, Row['severity']])
  );

const setup = (syncSeverity: jest.Mock = jest.fn().mockResolvedValue('updated' as Outcome)) => {
  const eventClient = { findEpisodeIdsByEventIds: jest.fn(), syncSeverity };
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
    it('gives each row the severity its investigation concluded and writes the stored rows that differ', async () => {
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
      expect(syncSeverity).toHaveBeenCalledTimes(1);
      expect(syncSeverity).toHaveBeenCalledWith({ eventId: 'event-1', severity: 'critical' });
    });

    it('gives the rows their concluded severity without writing them when repair is off', async () => {
      mockLoadInvestigationOutcomes.mockResolvedValue(available([['event-1', 'critical']]));
      const { severitySync, syncSeverity, eventClient } = setup();

      const rows = await severitySync.reconcileRows({
        rows: [{ event_id: 'event-1', severity: 'high' }],
        request,
        eventClient,
        repair: false,
      });
      await flush();

      expect(rows).toEqual([{ event_id: 'event-1', severity: 'critical' }]);
      expect(syncSeverity).not.toHaveBeenCalled();
    });

    it('keeps the stored severities and writes nothing while the investigations are unavailable', async () => {
      mockLoadInvestigationOutcomes.mockResolvedValue(unavailable('forbidden'));
      const { reconcile, syncSeverity } = setup();
      const rows = staleRows('kept', 2);

      expect(await reconcile(rows)).toEqual(rows);
      await flush();

      expect(syncSeverity).not.toHaveBeenCalled();
    });

    it('warns once per reason every 5 minutes, and not for a missing plugin or a forbidden read', async () => {
      const { reconcile } = setup();
      mockLoadInvestigationOutcomes.mockResolvedValue(unavailable('error'));
      await reconcile([]);
      await reconcile([]);
      expect(log.warn).toHaveBeenCalledTimes(1);

      // Another reason has its own window.
      mockLoadInvestigationOutcomes.mockResolvedValue(unavailable('timeout'));
      await reconcile([]);
      expect(log.warn).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(5 * 60_000 + 1);
      mockLoadInvestigationOutcomes.mockResolvedValue(unavailable('error'));
      await reconcile([]);
      expect(log.warn).toHaveBeenCalledTimes(3);

      for (const reason of ['not_installed', 'forbidden']) {
        mockLoadInvestigationOutcomes.mockResolvedValue(unavailable(reason));
        await reconcile([]);
      }
      expect(log.warn).toHaveBeenCalledTimes(3);
    });

    it('writes at most 20 rows per read, three at a time', async () => {
      const rows = staleRows('cap', 25);
      mockLoadInvestigationOutcomes.mockResolvedValue(allCritical(rows));
      let running = 0;
      let mostRunning = 0;
      const syncSeverity = jest.fn(async () => {
        running += 1;
        mostRunning = Math.max(mostRunning, running);
        await new Promise((resolve) => setTimeout(resolve, 10));
        running -= 1;
        return 'updated' as Outcome;
      });
      const { reconcile } = setup(syncSeverity);

      await reconcile(rows);
      await jest.advanceTimersByTimeAsync(1_000);

      expect(syncSeverity).toHaveBeenCalledTimes(20);
      expect(mostRunning).toBe(3);
    });

    it('does not write an event that is already being written, and leaves a lost race alone for a minute', async () => {
      const rows = staleRows('again', 1);
      mockLoadInvestigationOutcomes.mockResolvedValue(allCritical(rows));
      let finish: (outcome: Outcome) => void = () => undefined;
      const syncSeverity = jest.fn(() => new Promise<Outcome>((resolve) => (finish = resolve)));
      const { reconcile } = setup(syncSeverity);

      await reconcile(rows);
      await reconcile(rows);
      expect(syncSeverity).toHaveBeenCalledTimes(1);

      finish('superseded');
      await flush();
      await reconcile(rows);
      expect(syncSeverity).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(60_001);
      await reconcile(rows);
      expect(syncSeverity).toHaveBeenCalledTimes(2);
    });

    it('warns once per read, with the count, when writes fail', async () => {
      const rows = staleRows('fail', 3);
      mockLoadInvestigationOutcomes.mockResolvedValue(allCritical(rows));
      const { reconcile } = setup(jest.fn().mockRejectedValue(new Error('boom')));

      await reconcile(rows);
      await flush();

      expect(log.warn).toHaveBeenCalledTimes(1);
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('3 event(s): boom'));
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
      expect(syncSeverity).toHaveBeenCalledWith({ eventId: 'event-1', severity: 'high' });
      expect(syncSeverity).toHaveBeenCalledWith({ eventId: 'event-9', severity: 'low' });
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

      expect(syncSeverity).toHaveBeenCalledWith({ eventId: 'event-2', severity: 'low' });
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
