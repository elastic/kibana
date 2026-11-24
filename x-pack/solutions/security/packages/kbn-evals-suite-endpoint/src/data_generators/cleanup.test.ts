/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import { cleanupResponseActionsData, RESPONSE_ACTIONS_AGENT_ID_PREFIX } from './cleanup';

describe('cleanupResponseActionsData', () => {
  const buildClient = () => ({ deleteByQuery: jest.fn().mockResolvedValue({}) });

  const run = async () => {
    const esClient = buildClient();
    const internalEsClient = buildClient();
    await cleanupResponseActionsData({
      esClient: esClient as unknown as Client,
      internalEsClient: internalEsClient as unknown as Client,
    });
    return { esClient, internalEsClient };
  };

  it('removes the Fleet queue entries addressed to the suite agents', async () => {
    const { internalEsClient } = await run();

    expect(internalEsClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: AGENT_ACTIONS_INDEX,
        query: { prefix: { agents: RESPONSE_ACTIONS_AGENT_ID_PREFIX } },
      })
    );
  });

  it('removes the Fleet action results reported by the suite agents', async () => {
    const { internalEsClient } = await run();

    expect(internalEsClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: AGENT_ACTIONS_RESULTS_INDEX,
        query: { prefix: { agent_id: RESPONSE_ACTIONS_AGENT_ID_PREFIX } },
      })
    );
  });

  it('still cleans the other indices when a Fleet delete fails', async () => {
    const esClient = buildClient();
    const internalEsClient = buildClient();
    internalEsClient.deleteByQuery.mockImplementation(async ({ index }: { index: string }) => {
      if (index === AGENT_ACTIONS_INDEX) {
        throw new Error('index_not_found');
      }
      return {};
    });

    await expect(
      cleanupResponseActionsData({
        esClient: esClient as unknown as Client,
        internalEsClient: internalEsClient as unknown as Client,
      })
    ).resolves.toBeUndefined();

    expect(internalEsClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ index: '.fleet-agents' })
    );
  });
});
