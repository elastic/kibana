/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import {
  ENDPOINT_ACTIONS_INDEX,
  ENDPOINT_ACTION_RESPONSES_INDEX,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import { cleanupResponseActionsData, RESPONSE_ACTIONS_AGENT_ID_PREFIX } from './cleanup';

interface DeleteCall {
  index: string;
  query: Record<string, unknown>;
  options?: Record<string, unknown>;
}

const createClient = (calls: DeleteCall[]) =>
  ({
    deleteByQuery: jest.fn(
      async (
        request: { index: string; query: Record<string, unknown> },
        options?: Record<string, unknown>
      ) => {
        calls.push({ index: request.index, query: request.query, options });
        return {};
      }
    ),
  } as unknown as Client);

const findCall = (calls: DeleteCall[], index: string): DeleteCall | undefined =>
  calls.find((call) => call.index === index);

describe('cleanupResponseActionsData', () => {
  const esCalls: DeleteCall[] = [];
  const internalEsCalls: DeleteCall[] = [];

  beforeEach(async () => {
    esCalls.length = 0;
    internalEsCalls.length = 0;

    await cleanupResponseActionsData({
      esClient: createClient(esCalls),
      internalEsClient: createClient(internalEsCalls),
    });
  });

  it.each([ENDPOINT_ACTIONS_INDEX, ENDPOINT_ACTION_RESPONSES_INDEX])(
    'deletes the seeded response-action documents in %s',
    (index) => {
      // The seeded action request + response are what the golden action ids
      // read back. A cleanup that skips them leaves the documents in the
      // cluster, so the next run reads a previous run's data.
      expect(findCall(esCalls, index)?.query).toEqual({
        prefix: { 'agent.id': RESPONSE_ACTIONS_AGENT_ID_PREFIX },
      });
    }
  );

  it('deletes the Fleet action request by its `agents` array', () => {
    const call = findCall(internalEsCalls, AGENT_ACTIONS_INDEX);

    // `.fleet-actions` documents are keyed by `agents`, not `agent.id`: a
    // delete keyed on `agent.id` matches nothing and silently leaves them.
    expect(call?.query).toEqual({ prefix: { agents: RESPONSE_ACTIONS_AGENT_ID_PREFIX } });
    expect(call?.options).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-elastic-product-origin': 'fleet' }),
      })
    );
  });

  it('deletes the Fleet action result by its `agent_id`', () => {
    expect(findCall(internalEsCalls, AGENT_ACTIONS_RESULTS_INDEX)?.query).toEqual({
      prefix: { agent_id: RESPONSE_ACTIONS_AGENT_ID_PREFIX },
    });
  });

  it('does not delete documents belonging to another suite id namespace', () => {
    // `eval-agent-era-` must never be a prefix of, or prefixed by, another
    // suite's namespace — a prefix delete on one would reclaim the other's
    // documents.
    for (const call of [...esCalls, ...internalEsCalls]) {
      const prefix = Object.values((call.query as { prefix: Record<string, string> }).prefix)[0];
      expect(prefix).toBe(RESPONSE_ACTIONS_AGENT_ID_PREFIX);
    }
  });
});
