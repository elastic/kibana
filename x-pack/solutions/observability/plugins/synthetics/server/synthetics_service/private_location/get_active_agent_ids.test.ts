/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { SyntheticsServerSetup } from '../../types';
import { getRecentlyActiveAgentIds } from './get_active_agent_ids';
import * as getApiKeyModule from '../get_api_key';

const NOW = 1_700_000_000_000;
const WINDOW = 180_000;

const search = jest.fn();

const makeServer = (): SyntheticsServerSetup =>
  ({
    coreStart: {
      elasticsearch: { client: { asScoped: () => ({ asCurrentUser: { search } }) } },
    },
    logger: loggerMock.create(),
  } as unknown as SyntheticsServerSetup);

const mockValidApiKey = () =>
  jest
    .spyOn(getApiKeyModule, 'getAPIKeyForSyntheticsService')
    .mockResolvedValue({ apiKey: { id: 'k', apiKey: 's', name: 'n' }, isValid: true } as never);

const openSignal = () => new AbortController().signal;

const getActive = (
  server: SyntheticsServerSetup,
  agentIds: string[],
  signal: AbortSignal = openSignal()
) => getRecentlyActiveAgentIds(server, agentIds, WINDOW, NOW, signal);

describe('getRecentlyActiveAgentIds', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns an empty set (and issues no query) when there are no agents', async () => {
    const getApiKey = jest.spyOn(getApiKeyModule, 'getAPIKeyForSyntheticsService');

    const active = await getActive(makeServer(), []);

    expect(active.size).toBe(0);
    expect(getApiKey).not.toHaveBeenCalled();
    expect(search).not.toHaveBeenCalled();
  });

  it('returns the agent ids that wrote synthetics data within the window', async () => {
    mockValidApiKey();
    search.mockResolvedValue({
      aggregations: { agents: { buckets: [{ key: 'a' }, { key: 'c' }] } },
    });

    const active = await getActive(makeServer(), ['a', 'b', 'c']);

    expect([...active].sort()).toEqual(['a', 'c']);
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: [
              { range: { '@timestamp': { gte: NOW - WINDOW, format: 'epoch_millis' } } },
              { terms: { 'agent.id': ['a', 'b', 'c'] } },
            ],
          },
        },
      }),
      { signal: expect.any(AbortSignal) }
    );
  });

  it('returns an empty set when the synthetics API key is missing or invalid', async () => {
    jest
      .spyOn(getApiKeyModule, 'getAPIKeyForSyntheticsService')
      .mockResolvedValue({ isValid: false } as never);

    const active = await getActive(makeServer(), ['a']);

    expect(active.size).toBe(0);
    expect(search).not.toHaveBeenCalled();
  });

  it('is best-effort: returns an empty set if the query throws (falls back to check-in)', async () => {
    mockValidApiKey();
    search.mockRejectedValue(new Error('es boom'));

    const active = await getActive(makeServer(), ['a']);

    expect(active.size).toBe(0);
  });

  it('rethrows when the task signal aborts the ES query (does not treat abort as empty)', async () => {
    mockValidApiKey();
    const abortController = new AbortController();
    search.mockImplementation(async (_req: unknown, { signal }: { signal: AbortSignal }) => {
      abortController.abort();
      signal.throwIfAborted();
    });

    await expect(getActive(makeServer(), ['a'], abortController.signal)).rejects.toThrow();
  });
});
