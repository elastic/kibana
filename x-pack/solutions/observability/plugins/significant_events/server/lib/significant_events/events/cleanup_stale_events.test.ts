/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { TriggerEmitter } from '../../../workflows/triggers/emit';
import type { IRulesManagementClient } from '../../knowledge_indicators/knowledge_indicator_client/rules/rules_management_client';
import type { RuleEventsClient } from './rule_events_client';
import { asRuleEventsClient } from './rule_events_client.mock';
import { cleanupStaleEvents, STALE_EVENT_ASSESSMENT_NOTE } from './cleanup_stale_events';
import { EVENT_STATUS_CHANGED_TRIGGER_ID } from '../../../../common/workflows/triggers';

const EVENT_TIMESTAMP = '2026-01-01T00:00:00.000Z';

const writtenIds = (client: jest.Mocked<AlertEventsClientApi>): Array<string | undefined> =>
  client.createAlertEvent.mock.calls.map(([ruleEvent]) => ruleEvent.fingerprint);

const makeAlertEventsClient = (
  overrides: Partial<jest.Mocked<AlertEventsClientApi>> = {}
): jest.Mocked<AlertEventsClientApi> =>
  ({
    createAlertEvent: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as jest.Mocked<AlertEventsClientApi>);

const makeLogger = (): jest.Mocked<Logger> =>
  ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  } as unknown as jest.Mocked<Logger>);

const createEvent = (eventId: string, ruleIds: string[]): SignificantEventResponse =>
  ({
    '@timestamp': EVENT_TIMESTAMP,
    event_id: eventId,
    status: 'active',
    signals: ruleIds.map((ruleId) => ({
      type: 'detection',
      metadata: { rule_uuid: ruleId },
    })),
  } as SignificantEventResponse);

const groupHashOf = (eventId: string) => `group-${eventId}`;

let alertEventsClient: jest.Mocked<AlertEventsClientApi>;

const createEventSearchClient = (
  pages: SignificantEventResponse[][],
  emitTrigger?: TriggerEmitter
): RuleEventsClient =>
  asRuleEventsClient(
    {
      findLatestByEventId: jest
        .fn()
        .mockImplementation((eventId: string) =>
          Promise.resolve(pages.flat().find((event) => event.event_id === eventId))
        ),
      findLatestByCurrentStateBatch: jest
        .fn()
        .mockImplementation(({ afterGroupHash }: { afterGroupHash?: string }) => {
          const previousPageIndex =
            afterGroupHash === undefined
              ? -1
              : pages.findIndex(
                  (page) => groupHashOf(page.at(-1)?.event_id ?? '') === afterGroupHash
                );
          const hits = pages[previousPageIndex + 1] ?? [];
          const last = hits.at(-1);
          return Promise.resolve({
            hits,
            lastGroupHash: last ? groupHashOf(last.event_id) : undefined,
          });
        }),
    },
    { getAlertEventsClient: async () => alertEventsClient, emitTrigger }
  );

const createRulesClient = (existingIds: string[]): IRulesManagementClient =>
  ({
    findExistingRuleIds: jest.fn().mockResolvedValue(existingIds),
  } as unknown as IRulesManagementClient);

describe('cleanupStaleEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertEventsClient = makeAlertEventsClient();
  });

  it('inactivates only active events with no remaining backing rule', async () => {
    const stale = createEvent('stale-event', ['deleted-rule']);
    const mixed = createEvent('mixed-event', ['deleted-rule', 'live-rule']);
    const noRules = createEvent('no-rules-event', []);
    const eventSearchClient = createEventSearchClient([[stale, mixed, noRules]]);
    const rulesClient = createRulesClient(['live-rule']);
    alertEventsClient = makeAlertEventsClient();

    await expect(cleanupStaleEvents({ eventSearchClient, rulesClient })).resolves.toEqual({
      scanned: 3,
      closed: 1,
      kept: 1,
      skipped: 1,
      failed: 0,
    });

    expect(rulesClient.findExistingRuleIds).toHaveBeenCalledWith(['deleted-rule', 'live-rule']);
    expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(1);
    expect(alertEventsClient.createAlertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        fingerprint: 'stale-event',
        alert_status: 'inactive',
        data: expect.objectContaining({ assessment_note: STALE_EVENT_ASSESSMENT_NOTE }),
      })
    );
  });

  it('processes all keyset batches', async () => {
    const firstBatch = Array.from({ length: 1000 }, (_, index) =>
      createEvent(`event-${String(index).padStart(4, '0')}`, ['rule-1'])
    );
    const eventSearchClient = createEventSearchClient([
      firstBatch,
      [createEvent('event-1000', ['rule-2'])],
    ]);
    const rulesClient = createRulesClient([]);
    alertEventsClient = makeAlertEventsClient();

    await cleanupStaleEvents({ eventSearchClient, rulesClient });

    expect(eventSearchClient.findLatestByCurrentStateBatch).toHaveBeenCalledTimes(2);
    expect(eventSearchClient.findLatestByCurrentStateBatch).toHaveBeenNthCalledWith(2, {
      status: ['active', 'recovering'],
      ruleUuids: undefined,
      afterGroupHash: 'group-event-0999',
      batchSize: 1000,
    });
    expect(rulesClient.findExistingRuleIds).toHaveBeenNthCalledWith(1, ['rule-1']);
    expect(rulesClient.findExistingRuleIds).toHaveBeenNthCalledWith(2, ['rule-2']);
    expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(1001);
  });

  it('uses candidate rule IDs to narrow rule-deletion cleanup', async () => {
    const eventSearchClient = createEventSearchClient([]);
    const rulesClient = createRulesClient([]);

    await cleanupStaleEvents({
      eventSearchClient,
      rulesClient,
      candidateRuleIds: ['rule-1', 'rule-1'],
    });

    expect(eventSearchClient.findLatestByCurrentStateBatch).toHaveBeenCalledWith({
      status: ['active', 'recovering'],
      ruleUuids: ['rule-1'],
      afterGroupHash: undefined,
      batchSize: 1000,
    });
  });

  it('does not write when checking live rules fails', async () => {
    const eventSearchClient = createEventSearchClient([[createEvent('event-1', ['rule-1'])]]);
    const rulesClient = createRulesClient([]);
    alertEventsClient = makeAlertEventsClient();
    jest
      .mocked(rulesClient.findExistingRuleIds)
      .mockRejectedValueOnce(new Error('rule lookup failed'));

    await expect(cleanupStaleEvents({ eventSearchClient, rulesClient })).rejects.toThrow(
      'rule lookup failed'
    );
    expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
  });

  it('keeps completed batches when a later rule lookup fails', async () => {
    const firstBatch = Array.from({ length: 1000 }, (_, index) =>
      createEvent(`event-${String(index).padStart(4, '0')}`, ['rule-1'])
    );
    const eventSearchClient = createEventSearchClient([
      firstBatch,
      [createEvent('event-1000', ['rule-2'])],
    ]);
    const rulesClient = createRulesClient([]);
    alertEventsClient = makeAlertEventsClient();
    jest
      .mocked(rulesClient.findExistingRuleIds)
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('later lookup failed'));

    await expect(cleanupStaleEvents({ eventSearchClient, rulesClient })).rejects.toThrow(
      'later lookup failed'
    );
    expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(1000);
    expect(writtenIds(alertEventsClient)).not.toContain('event-1000');
  });

  it('limits concurrent event status updates', async () => {
    const eventSearchClient = createEventSearchClient([
      Array.from({ length: 11 }, (_, index) => createEvent(`event-${index}`, ['deleted-rule'])),
    ]);
    const rulesClient = createRulesClient([]);
    let activeUpdates = 0;
    let maxActiveUpdates = 0;
    alertEventsClient = makeAlertEventsClient({
      createAlertEvent: jest.fn().mockImplementation(async () => {
        activeUpdates += 1;
        maxActiveUpdates = Math.max(maxActiveUpdates, activeUpdates);
        await Promise.resolve();
        activeUpdates -= 1;
      }),
    });

    await cleanupStaleEvents({ eventSearchClient, rulesClient });

    expect(maxActiveUpdates).toBe(10);
  });

  describe('.rule-events writes', () => {
    it('appends a version through alertEventsClient for every stale event', async () => {
      const stale1 = createEvent('stale-1', ['deleted-rule']);
      const stale2 = createEvent('stale-2', ['deleted-rule']);
      const eventSearchClient = createEventSearchClient([[stale1, stale2]]);
      const rulesClient = createRulesClient([]);
      alertEventsClient = makeAlertEventsClient();

      await cleanupStaleEvents({ eventSearchClient, rulesClient });

      expect(writtenIds(alertEventsClient)).toEqual(['stale-1', 'stale-2']);
    });

    it('notifies subscribed workflows of each closed event', async () => {
      const stale = createEvent('stale-1', ['deleted-rule']);
      const emitTrigger = jest.fn();
      const eventSearchClient = createEventSearchClient([[stale]], emitTrigger);

      await cleanupStaleEvents({ eventSearchClient, rulesClient: createRulesClient([]) });

      expect(emitTrigger).toHaveBeenCalledWith(
        EVENT_STATUS_CHANGED_TRIGGER_ID,
        expect.objectContaining({ event_id: 'stale-1', previous_status: 'active' })
      );
    });

    it('leaves an event open when another writer appended since the scan', async () => {
      const stale = createEvent('stale-1', ['deleted-rule']);
      const eventSearchClient = createEventSearchClient([[stale]]);
      jest
        .mocked(eventSearchClient.findLatestByEventId)
        .mockResolvedValue({ ...stale, '@timestamp': '2099-01-01T00:00:00.000Z' });
      alertEventsClient = makeAlertEventsClient();
      const logger = makeLogger();

      await expect(
        cleanupStaleEvents({
          eventSearchClient,
          rulesClient: createRulesClient([]),
          logger,
        })
      ).resolves.toMatchObject({ closed: 0, failed: 0 });
      expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('stale-1'));
    });

    it('does not overwrite a version appended between the read and the write', async () => {
      const stale = createEvent('stale-1', ['deleted-rule']);
      const eventSearchClient = createEventSearchClient([[stale]]);
      jest
        .mocked(eventSearchClient.findLatestByEventId)
        .mockResolvedValueOnce(stale)
        .mockResolvedValueOnce({ ...stale, '@timestamp': '2099-01-01T00:00:00.000Z' });
      alertEventsClient = makeAlertEventsClient();

      await expect(
        cleanupStaleEvents({
          eventSearchClient,
          rulesClient: createRulesClient([]),
        })
      ).resolves.toMatchObject({ closed: 0, failed: 0 });
      expect(alertEventsClient.createAlertEvent).not.toHaveBeenCalled();
    });

    it('counts a rejected close as failed and keeps going', async () => {
      const stale1 = createEvent('stale-1', ['deleted-rule']);
      const stale2 = createEvent('stale-2', ['deleted-rule']);
      const eventSearchClient = createEventSearchClient([[stale1, stale2]]);
      const rulesClient = createRulesClient([]);
      alertEventsClient = makeAlertEventsClient({
        createAlertEvent: jest.fn().mockImplementation(async ({ fingerprint }) => {
          if (fingerprint === 'stale-1') {
            throw new Error('write failed');
          }
        }),
      });
      const logger = makeLogger();

      await expect(cleanupStaleEvents({ eventSearchClient, rulesClient, logger })).resolves.toEqual(
        {
          scanned: 2,
          closed: 1,
          kept: 0,
          skipped: 0,
          failed: 1,
        }
      );
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('stale-1'));
    });
  });
});
