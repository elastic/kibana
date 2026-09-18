/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import type { IRulesManagementClient } from '../../knowledge_indicators/knowledge_indicator_client/rules/rules_management_client';
import type { EventClient } from './event_client';
import { cleanupStaleEvents, STALE_EVENT_ASSESSMENT_NOTE } from './cleanup_stale_events';
import { updateSignificantEventStatus } from './update_event_status';

jest.mock('./update_event_status', () => ({
  updateSignificantEventStatus: jest.fn(),
}));

const updateStatusMock = updateSignificantEventStatus as jest.MockedFunction<
  typeof updateSignificantEventStatus
>;

const createEvent = (eventUuid: string, ruleIds: string[]): SignificantEventResponse =>
  ({
    event_uuid: eventUuid,
    event_id: eventUuid,
    signals: ruleIds.map((ruleId) => ({
      type: 'detection',
      metadata: { rule_uuid: ruleId },
    })),
  } as SignificantEventResponse);

const createEventClient = (pages: SignificantEventResponse[][]): EventClient =>
  ({
    findLatestByCurrentStateBatch: jest
      .fn()
      .mockImplementation(({ afterEventId }: { afterEventId?: string }) => {
        const previousPageIndex =
          afterEventId === undefined
            ? -1
            : pages.findIndex((page) => page.at(-1)?.event_id === afterEventId);
        return Promise.resolve({ hits: pages[previousPageIndex + 1] ?? [] });
      }),
  } as unknown as EventClient);

const createRulesClient = (existingIds: string[]): IRulesManagementClient =>
  ({
    findExistingRuleIds: jest.fn().mockResolvedValue(existingIds),
  } as unknown as IRulesManagementClient);

describe('cleanupStaleEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateStatusMock.mockResolvedValue({
      event_uuid: 'next-event',
      updated: 1,
      ignored: 0,
      status: 'closed',
    });
  });

  it('closes only open events with no remaining backing rule', async () => {
    const stale = createEvent('stale-event', ['deleted-rule']);
    const mixed = createEvent('mixed-event', ['deleted-rule', 'live-rule']);
    const noRules = createEvent('no-rules-event', []);
    const eventClient = createEventClient([[stale, mixed, noRules]]);
    const rulesClient = createRulesClient(['live-rule']);

    await expect(cleanupStaleEvents({ eventClient, rulesClient })).resolves.toEqual({
      scanned: 3,
      closed: 1,
      kept: 1,
      skipped: 1,
    });

    expect(rulesClient.findExistingRuleIds).toHaveBeenCalledWith(['deleted-rule', 'live-rule']);
    expect(updateStatusMock).toHaveBeenCalledTimes(1);
    expect(updateStatusMock).toHaveBeenCalledWith({
      eventClient,
      eventUuid: 'stale-event',
      status: 'closed',
      assessmentNote: STALE_EVENT_ASSESSMENT_NOTE,
    });
  });

  it('processes all keyset batches', async () => {
    const firstBatch = Array.from({ length: 1000 }, (_, index) =>
      createEvent(`event-${String(index).padStart(4, '0')}`, ['rule-1'])
    );
    const eventClient = createEventClient([firstBatch, [createEvent('event-1000', ['rule-2'])]]);
    const rulesClient = createRulesClient([]);

    await cleanupStaleEvents({ eventClient, rulesClient });

    expect(eventClient.findLatestByCurrentStateBatch).toHaveBeenCalledTimes(2);
    expect(eventClient.findLatestByCurrentStateBatch).toHaveBeenNthCalledWith(2, {
      status: ['open'],
      ruleUuids: undefined,
      afterEventId: 'event-0999',
      batchSize: 1000,
    });
    expect(rulesClient.findExistingRuleIds).toHaveBeenNthCalledWith(1, ['rule-1']);
    expect(rulesClient.findExistingRuleIds).toHaveBeenNthCalledWith(2, ['rule-2']);
    expect(updateStatusMock).toHaveBeenCalledTimes(1001);
  });

  it('uses candidate rule IDs to narrow rule-deletion cleanup', async () => {
    const eventClient = createEventClient([]);
    const rulesClient = createRulesClient([]);

    await cleanupStaleEvents({
      eventClient,
      rulesClient,
      candidateRuleIds: ['rule-1', 'rule-1'],
    });

    expect(eventClient.findLatestByCurrentStateBatch).toHaveBeenCalledWith({
      status: ['open'],
      ruleUuids: ['rule-1'],
      afterEventId: undefined,
      batchSize: 1000,
    });
  });

  it('does not write when checking live rules fails', async () => {
    const eventClient = createEventClient([[createEvent('event-1', ['rule-1'])]]);
    const rulesClient = createRulesClient([]);
    jest
      .mocked(rulesClient.findExistingRuleIds)
      .mockRejectedValueOnce(new Error('rule lookup failed'));

    await expect(cleanupStaleEvents({ eventClient, rulesClient })).rejects.toThrow(
      'rule lookup failed'
    );
    expect(updateStatusMock).not.toHaveBeenCalled();
  });

  it('keeps completed batches when a later rule lookup fails', async () => {
    const firstBatch = Array.from({ length: 1000 }, (_, index) =>
      createEvent(`event-${String(index).padStart(4, '0')}`, ['rule-1'])
    );
    const eventClient = createEventClient([firstBatch, [createEvent('event-1000', ['rule-2'])]]);
    const rulesClient = createRulesClient([]);
    jest
      .mocked(rulesClient.findExistingRuleIds)
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('later lookup failed'));

    await expect(cleanupStaleEvents({ eventClient, rulesClient })).rejects.toThrow(
      'later lookup failed'
    );
    expect(updateStatusMock).toHaveBeenCalledTimes(1000);
    expect(updateStatusMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventUuid: 'event-1000' })
    );
  });

  it('limits concurrent event status updates', async () => {
    const eventClient = createEventClient([
      Array.from({ length: 11 }, (_, index) => createEvent(`event-${index}`, ['deleted-rule'])),
    ]);
    const rulesClient = createRulesClient([]);
    let activeUpdates = 0;
    let maxActiveUpdates = 0;
    updateStatusMock.mockImplementation(async ({ eventUuid }) => {
      activeUpdates += 1;
      maxActiveUpdates = Math.max(maxActiveUpdates, activeUpdates);
      await Promise.resolve();
      activeUpdates -= 1;
      return {
        event_uuid: eventUuid,
        updated: 1,
        ignored: 0,
        status: 'closed',
      };
    });

    await cleanupStaleEvents({ eventClient, rulesClient });

    expect(maxActiveUpdates).toBe(10);
  });
});
