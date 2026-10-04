/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { deleteIndexedFleetAgents, type IndexedFleetAgentResponse } from './index_fleet_agent';
import { EndpointDataLoadingError } from './utils';

const indexedData: IndexedFleetAgentResponse = {
  fleetAgentsIndex: '.fleet-agents',
  agents: [
    {
      type: 'PERMANENT',
      active: true,
      enrolled_at: '2020-01-01T00:00:00.000Z',
      local_metadata: { elastic: { agent: { id: 'agent-1' } } },
    },
  ],
};

const agentIndexes = ['.fleet-agents', '.fleet-agents-*'];

const createEsClient = ({
  deleteByQuery,
  refresh,
  count,
  updateByQuery = jest.fn().mockResolvedValue({}),
}: {
  deleteByQuery: jest.Mock;
  refresh: jest.Mock;
  count: jest.Mock;
  updateByQuery?: jest.Mock;
}): Client =>
  ({
    deleteByQuery,
    count,
    updateByQuery,
    indices: { refresh },
  } as unknown as Client);

describe('deleteIndexedFleetAgents', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('refreshes the index after a version conflict and retries', async () => {
    const deleteByQuery = jest
      .fn()
      .mockResolvedValueOnce({ version_conflicts: 1 })
      .mockResolvedValueOnce({ version_conflicts: 0 });
    const refresh = jest.fn().mockResolvedValue({});
    const count = jest.fn().mockResolvedValue({ count: 0 });

    const pending = deleteIndexedFleetAgents(
      createEsClient({ deleteByQuery, refresh, count }),
      indexedData
    );
    await jest.runAllTimersAsync();

    await expect(pending).resolves.toEqual({ agents: { version_conflicts: 0 } });
    expect(deleteByQuery).toHaveBeenCalledTimes(2);
    expect(deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: agentIndexes,
        conflicts: 'proceed',
        expand_wildcards: 'all',
      })
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith({
      index: agentIndexes,
      ignore_unavailable: true,
      expand_wildcards: 'all',
    });
    expect(count).toHaveBeenCalled();
  });

  it('throws when agents are still active after the inactive fallback', async () => {
    const deleteByQuery = jest.fn().mockResolvedValue({ version_conflicts: 1 });
    const refresh = jest.fn().mockResolvedValue({});
    const count = jest.fn().mockResolvedValue({ count: 1 });
    const updateByQuery = jest.fn().mockResolvedValue({});

    const pending = deleteIndexedFleetAgents(
      createEsClient({ deleteByQuery, refresh, count, updateByQuery }),
      indexedData
    );
    const assertion = expect(pending).rejects.toThrow(EndpointDataLoadingError);
    await jest.runAllTimersAsync();
    await assertion;

    expect(deleteByQuery).toHaveBeenCalledTimes(5);
    expect(refresh).toHaveBeenCalledTimes(5);
    expect(updateByQuery).toHaveBeenCalledTimes(1);
  });

  it('keeps deleting when a refresh fails', async () => {
    const deleteByQuery = jest.fn().mockResolvedValue({ version_conflicts: 1 });
    const refresh = jest
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('refresh failed'))
      .mockResolvedValue({});
    const count = jest.fn().mockResolvedValue({ count: 0 });
    const updateByQuery = jest.fn().mockResolvedValue({});

    const pending = deleteIndexedFleetAgents(
      createEsClient({ deleteByQuery, refresh, count, updateByQuery }),
      indexedData
    );
    await jest.runAllTimersAsync();

    await expect(pending).resolves.toEqual({ agents: { version_conflicts: 1 } });
    expect(deleteByQuery).toHaveBeenCalledTimes(5);
    expect(refresh).toHaveBeenCalledTimes(5);
    expect(updateByQuery).toHaveBeenCalledTimes(1);
  });
});
