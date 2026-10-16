/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';
import { ALERT_WORKFLOW_TAGS } from '@kbn/rule-data-utils';
import { ruleRegistryMocks } from '@kbn/rule-registry-plugin/server/mocks';
import type { RuleDataClientMock } from '@kbn/rule-registry-plugin/server/rule_data_client/rule_data_client.mock';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SecuritySolutionRequestHandlerContextMock } from '../__mocks__/request_context';
import { requestContextMock } from '../__mocks__';
import { executeCascadeListField } from './cascade_list_field_helpers';

const SCHEDULED_INDEX = `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-default`;
const ADHOC_INDEX = `${ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX}-default`;
const DETECTION_ALERTS_INDEX = '.alerts-security.alerts-default';

const searchResponse = (
  hits: Array<{ _id: string; _index?: string; tags?: string[]; alertIds?: string[] }>
): estypes.SearchResponse<unknown> =>
  ({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: {
      total: { value: hits.length, relation: 'eq' },
      max_score: 0,
      hits: hits.map(({ _id, _index = SCHEDULED_INDEX, tags, alertIds }) => ({
        _id,
        _index,
        _source: {
          ...(tags === undefined ? {} : { [ALERT_WORKFLOW_TAGS]: tags }),
          ...(alertIds === undefined ? {} : { [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: alertIds }),
        },
      })),
    },
  } as estypes.SearchResponse<unknown>);

describe('executeCascadeListField', () => {
  let context: SecuritySolutionRequestHandlerContextMock;
  let esClient: SecuritySolutionRequestHandlerContextMock['core']['elasticsearch']['client']['asCurrentUser'];
  let ruleDataClient: RuleDataClientMock;
  let mutate: jest.Mock;
  let emitAttack: jest.Mock;
  let emitAlert: jest.Mock;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const eventBus = {} as Parameters<typeof executeCascadeListField>[0]['eventBus'];

  const run = (overrides: Partial<Parameters<typeof executeCascadeListField>[0]> = {}) =>
    executeCascadeListField({
      context: requestContextMock.convertContext(context),
      ruleDataClient,
      attackIndex: [SCHEDULED_INDEX, ADHOC_INDEX],
      ids: ['attack1'],
      field: ALERT_WORKFLOW_TAGS,
      rawToAdd: ['new-tag'],
      rawToRemove: [],
      validToAdd: ['new-tag'],
      validToRemove: [],
      operationTruncated: false,
      mutate,
      eventBus,
      emitAttack,
      emitAlert,
      logger,
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    ({ context } = requestContextMock.createTools());
    esClient = context.core.elasticsearch.client.asCurrentUser;
    ruleDataClient = ruleRegistryMocks.createRuleDataClient('.alerts-security.alerts');
    mutate = jest.fn().mockResolvedValue({ updated: 1 });
    emitAttack = jest.fn();
    emitAlert = jest.fn();
    logger = loggingSystemMock.createLogger();
  });

  it('mutates every found attack and related alert, including ones that would not change', async () => {
    // Encoding WHY: the mutation set and the emission set are deliberately different. The
    // update must still run for documents the trigger will not report — narrowing the
    // mutation to would-change documents would change the API's behaviour, not just the event.
    esClient.search
      .mockResolvedValueOnce(
        searchResponse([
          { _id: 'attack1', tags: ['new-tag'], alertIds: ['alert1'] },
          { _id: 'attack2', tags: [], alertIds: ['alert2'] },
        ])
      )
      .mockResolvedValueOnce(
        searchResponse([{ _id: 'alert1', _index: DETECTION_ALERTS_INDEX, tags: ['new-tag'] }])
      );

    await run({ ids: ['attack1', 'attack2'] });

    const [, combinedIds] = mutate.mock.calls[0];
    expect(combinedIds).toEqual(['attack1', 'attack2', 'alert1', 'alert2']);
  });

  it('emits only the attacks the update would actually change', async () => {
    // Encoding WHY: attack1 already carries the requested tag, so reporting it as changed
    // would make a workflow act on a mutation that never happened.
    esClient.search
      .mockResolvedValueOnce(
        searchResponse([
          { _id: 'attack1', tags: ['new-tag'], alertIds: [] },
          { _id: 'attack2', tags: [], alertIds: [] },
        ])
      )
      .mockResolvedValueOnce(searchResponse([]));

    await run({ ids: ['attack1', 'attack2'] });

    expect(emitAttack).toHaveBeenCalledWith(['attack2'], ['new-tag'], [], false);
  });

  it('does not emit an attack event when no attack would change', async () => {
    esClient.search.mockResolvedValueOnce(
      searchResponse([{ _id: 'attack1', tags: ['new-tag'], alertIds: [] }])
    );

    await run();

    expect(emitAttack).not.toHaveBeenCalled();
    expect(mutate).toHaveBeenCalled();
  });

  it('excludes attack discovery hits from the related-alert emission', async () => {
    // Encoding WHY: the unified index spans detection alerts and both attack families, so a
    // stale related-alert reference whose _id collides with an attack doc must not be emitted
    // as a detection-alert event.
    esClient.search
      .mockResolvedValueOnce(searchResponse([{ _id: 'attack1', tags: [], alertIds: ['ghost'] }]))
      .mockResolvedValueOnce(searchResponse([{ _id: 'ghost', _index: SCHEDULED_INDEX, tags: [] }]));

    await run();

    expect(emitAlert).not.toHaveBeenCalled();
  });

  it('emits related alerts that would change and drops the ones that would not', async () => {
    esClient.search
      .mockResolvedValueOnce(
        searchResponse([{ _id: 'attack1', tags: [], alertIds: ['alert1', 'alert2'] }])
      )
      .mockResolvedValueOnce(
        searchResponse([
          { _id: 'alert1', _index: DETECTION_ALERTS_INDEX, tags: ['new-tag'] },
          { _id: 'alert2', _index: DETECTION_ALERTS_INDEX, tags: [] },
        ])
      );

    await run();

    expect(emitAlert).toHaveBeenCalledWith(['alert2'], ['new-tag'], [], false);
  });

  it('suppresses the related-alert event when the related-source fetch fails, without blocking the mutation', async () => {
    // Encoding WHY: with the fetch failed the delta is unknown, and emitting the request as
    // an observed fact is the exact inaccuracy the fact-style payload contract forbids. The
    // mutation and the attack event must still go through.
    esClient.search
      .mockResolvedValueOnce(searchResponse([{ _id: 'attack1', tags: [], alertIds: ['alert1'] }]))
      .mockRejectedValueOnce(new Error('related fetch failed'));

    await run();

    expect(emitAlert).not.toHaveBeenCalled();
    expect(emitAttack).toHaveBeenCalledWith(['attack1'], ['new-tag'], [], false);
    expect(mutate).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch related alert sources for workflow trigger')
    );
  });

  it('skips the related-alert fetch entirely when no event bus is wired', async () => {
    // Encoding WHY: the second search exists only to build the event payload. With no
    // subscriber there is nothing to report, so the request must not pay for it.
    esClient.search.mockResolvedValueOnce(
      searchResponse([{ _id: 'attack1', tags: [], alertIds: ['alert1'] }])
    );

    await run({ eventBus: undefined });

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(emitAlert).not.toHaveBeenCalled();
  });

  it('propagates operationTruncated to both emits so a capped payload is never reported as complete', async () => {
    esClient.search
      .mockResolvedValueOnce(searchResponse([{ _id: 'attack1', tags: [], alertIds: ['alert1'] }]))
      .mockResolvedValueOnce(
        searchResponse([{ _id: 'alert1', _index: DETECTION_ALERTS_INDEX, tags: [] }])
      );

    await run({ operationTruncated: true });

    expect(emitAttack).toHaveBeenCalledWith(['attack1'], ['new-tag'], [], true);
    expect(emitAlert).toHaveBeenCalledWith(['alert1'], ['new-tag'], [], true);
  });

  it('returns the mutation result to the caller', async () => {
    esClient.search
      .mockResolvedValueOnce(searchResponse([{ _id: 'attack1', tags: [], alertIds: [] }]))
      .mockResolvedValueOnce(searchResponse([]));

    await expect(run()).resolves.toEqual({ updated: 1 });
  });
});
