/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { IRulesManagementClient } from '../../knowledge_indicators/knowledge_indicator_client/rules/rules_management_client';
import type { RuleEventsClient } from './rule_events_client';
import { cleanupStaleEvents, STALE_EVENT_ASSESSMENT_NOTE } from './cleanup_stale_events';
import { updateSignificantEventStatus } from './update_event_status';

jest.mock('./update_event_status', () => ({
  updateSignificantEventStatus: jest.fn(),
}));

const updateStatusMock = updateSignificantEventStatus as jest.MockedFunction<
  typeof updateSignificantEventStatus
>;

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
    event_id: eventId,
    signals: ruleIds.map((ruleId) => ({
      type: 'detection',
      metadata: { rule_uuid: ruleId },
    })),
  } as SignificantEventResponse);

const groupHashOf = (eventId: string) => `group-${eventId}`;

const createEventSearchClient = (pages: SignificantEventResponse[][]): RuleEventsClient =>
  ({
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
  } as unknown as RuleEventsClient);

const createRulesClient = (existingIds: string[]): IRulesManagementClient =>
  ({
    findExistingRuleIds: jest.fn().mockResolvedValue(existingIds),
  } as unknown as IRulesManagementClient);

describe('cleanupStaleEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateStatusMock.mockResolvedValue({
      updated: 1,
      ignored: 0,
      status: 'inactive',
    });
  });

  it('inactivates only active events with no remaining backing rule', async () => {
    const stale = createEvent('stale-event', ['deleted-rule']);
    const mixed = createEvent('mixed-event', ['deleted-rule', 'live-rule']);
    const noRules = createEvent('no-rules-event', []);
    const eventSearchClient = createEventSearchClient([[stale, mixed, noRules]]);
    const rulesClient = createRulesClient(['live-rule']);
    const alertEventsClient = makeAlertEventsClient();

    await expect(
      cleanupStaleEvents({ eventSearchClient, rulesClient, alertEventsClient })
    ).resolves.toEqual({
      scanned: 3,
      closed: 1,
      kept: 1,
      skipped: 1,
      failed: 0,
    });

    expect(rulesClient.findExistingRuleIds).toHaveBeenCalledWith(['deleted-rule', 'live-rule']);
    expect(updateStatusMock).toHaveBeenCalledTimes(1);
    expect(updateStatusMock).toHaveBeenCalledWith({
      eventSearchClient,
      eventId: 'stale-event',
      status: 'inactive',
      assessmentNote: STALE_EVENT_ASSESSMENT_NOTE,
      alertEventsClient,
    });
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

    await cleanupStaleEvents({
      eventSearchClient,
      rulesClient,
      alertEventsClient: makeAlertEventsClient(),
    });

    expect(eventSearchClient.findLatestByCurrentStateBatch).toHaveBeenCalledTimes(2);
    expect(eventSearchClient.findLatestByCurrentStateBatch).toHaveBeenNthCalledWith(2, {
      status: ['active'],
      ruleUuids: undefined,
      afterGroupHash: 'group-event-0999',
      batchSize: 1000,
    });
    expect(rulesClient.findExistingRuleIds).toHaveBeenNthCalledWith(1, ['rule-1']);
    expect(rulesClient.findExistingRuleIds).toHaveBeenNthCalledWith(2, ['rule-2']);
    expect(updateStatusMock).toHaveBeenCalledTimes(1001);
  });

  it('uses candidate rule IDs to narrow rule-deletion cleanup', async () => {
    const eventSearchClient = createEventSearchClient([]);
    const rulesClient = createRulesClient([]);

    await cleanupStaleEvents({
      eventSearchClient,
      rulesClient,
      candidateRuleIds: ['rule-1', 'rule-1'],
      alertEventsClient: makeAlertEventsClient(),
    });

    expect(eventSearchClient.findLatestByCurrentStateBatch).toHaveBeenCalledWith({
      status: ['active'],
      ruleUuids: ['rule-1'],
      afterGroupHash: undefined,
      batchSize: 1000,
    });
  });

  it('does not write when checking live rules fails', async () => {
    const eventSearchClient = createEventSearchClient([[createEvent('event-1', ['rule-1'])]]);
    const rulesClient = createRulesClient([]);
    jest
      .mocked(rulesClient.findExistingRuleIds)
      .mockRejectedValueOnce(new Error('rule lookup failed'));

    await expect(
      cleanupStaleEvents({
        eventSearchClient,
        rulesClient,
        alertEventsClient: makeAlertEventsClient(),
      })
    ).rejects.toThrow('rule lookup failed');
    expect(updateStatusMock).not.toHaveBeenCalled();
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
    jest
      .mocked(rulesClient.findExistingRuleIds)
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('later lookup failed'));

    await expect(
      cleanupStaleEvents({
        eventSearchClient,
        rulesClient,
        alertEventsClient: makeAlertEventsClient(),
      })
    ).rejects.toThrow('later lookup failed');
    expect(updateStatusMock).toHaveBeenCalledTimes(1000);
    expect(updateStatusMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'event-1000' })
    );
  });

  it('limits concurrent event status updates', async () => {
    const eventSearchClient = createEventSearchClient([
      Array.from({ length: 11 }, (_, index) => createEvent(`event-${index}`, ['deleted-rule'])),
    ]);
    const rulesClient = createRulesClient([]);
    let activeUpdates = 0;
    let maxActiveUpdates = 0;
    updateStatusMock.mockImplementation(async ({ eventId }) => {
      activeUpdates += 1;
      maxActiveUpdates = Math.max(maxActiveUpdates, activeUpdates);
      await Promise.resolve();
      activeUpdates -= 1;
      return {
        updated: 1,
        ignored: 0,
        status: 'inactive',
      };
    });

    await cleanupStaleEvents({
      eventSearchClient,
      rulesClient,
      alertEventsClient: makeAlertEventsClient(),
    });

    expect(maxActiveUpdates).toBe(10);
  });

  describe('.rule-events writes', () => {
    it('propagates alertEventsClient to each updateSignificantEventStatus call', async () => {
      const stale = createEvent('stale-1', ['deleted-rule']);
      const eventSearchClient = createEventSearchClient([[stale]]);
      const rulesClient = createRulesClient([]);
      const alertEventsClient = makeAlertEventsClient();

      await cleanupStaleEvents({ eventSearchClient, rulesClient, alertEventsClient });

      expect(updateStatusMock).toHaveBeenCalledWith(expect.objectContaining({ alertEventsClient }));
    });

    it('passes alertEventsClient to every stale event update', async () => {
      const stale1 = createEvent('stale-1', ['deleted-rule']);
      const stale2 = createEvent('stale-2', ['deleted-rule']);
      const eventSearchClient = createEventSearchClient([[stale1, stale2]]);
      const rulesClient = createRulesClient([]);
      const alertEventsClient = makeAlertEventsClient();

      await cleanupStaleEvents({ eventSearchClient, rulesClient, alertEventsClient });

      expect(updateStatusMock).toHaveBeenCalledTimes(2);
      for (const call of updateStatusMock.mock.calls) {
        expect(call[0]).toMatchObject({ alertEventsClient });
      }
    });

    it('counts a rejected close as failed and keeps going', async () => {
      const stale1 = createEvent('stale-1', ['deleted-rule']);
      const stale2 = createEvent('stale-2', ['deleted-rule']);
      const eventSearchClient = createEventSearchClient([[stale1, stale2]]);
      const rulesClient = createRulesClient([]);
      const alertEventsClient = makeAlertEventsClient();
      const logger = makeLogger();
      updateStatusMock.mockImplementation(async ({ eventId }) => {
        if (eventId === 'stale-1') {
          throw new Error('write failed');
        }
        return { updated: 1, ignored: 0, status: 'inactive' as const };
      });

      await expect(
        cleanupStaleEvents({ eventSearchClient, rulesClient, alertEventsClient, logger })
      ).resolves.toEqual({
        scanned: 2,
        closed: 1,
        kept: 0,
        skipped: 0,
        failed: 1,
      });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('stale-1'));
    });
  });
});
