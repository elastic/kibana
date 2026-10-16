/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { AgentPolicy } from '@kbn/fleet-plugin/common';
import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';
import type { KbnClient } from '@kbn/test';
import { deleteIndexedFleetEndpointPolicies } from './index_fleet_endpoint_policy';
import type { IndexedFleetEndpointPolicyResponse } from './index_fleet_endpoint_policy';
import type { PolicyData } from '../types';
import { EndpointDataLoadingError } from './utils';

const policyIds = ['policy-a', 'policy-b'];

const indexData: IndexedFleetEndpointPolicyResponse = {
  integrationPolicies: [{ id: 'integration-1' } as PolicyData],
  agentPolicies: policyIds.map((id) => ({ id } as AgentPolicy)),
};

const assignedAgentsQuery = {
  bool: {
    filter: [{ term: { active: true } }, { terms: { policy_id: policyIds } }],
  },
};

const createKbnClient = (calls: string[]): KbnClient =>
  ({
    request: jest.fn(
      async ({ body }: { body: { packagePolicyIds?: string[]; agentPolicyId?: string } }) => {
        if (body.packagePolicyIds) {
          calls.push('package');
        }
        if (body.agentPolicyId) {
          calls.push(`agent:${body.agentPolicyId}`);
        }
        return { data: {} };
      }
    ),
  } as unknown as KbnClient);

const createEsClient = ({
  deleteByQuery,
  count,
  updateByQuery,
}: {
  deleteByQuery: jest.Mock;
  count: jest.Mock;
  updateByQuery: jest.Mock;
}): Client =>
  ({
    deleteByQuery,
    count,
    updateByQuery,
  } as unknown as Client);

describe('deleteIndexedFleetEndpointPolicies', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deletes policies without touching agents when no es client is passed', async () => {
    const calls: string[] = [];

    await deleteIndexedFleetEndpointPolicies(createKbnClient(calls), indexData);

    expect(calls).toEqual(['package', 'agent:policy-a', 'agent:policy-b']);
  });

  it('deletes agents for those policy ids before the agent policy delete', async () => {
    const calls: string[] = [];
    const deleteByQuery = jest.fn(async () => {
      calls.push('delete-agents');
      return {};
    });
    const count = jest.fn(async () => ({ count: 0 }));
    const updateByQuery = jest.fn();

    await deleteIndexedFleetEndpointPolicies(
      createKbnClient(calls),
      indexData,
      createEsClient({ deleteByQuery, count, updateByQuery })
    );

    expect(calls).toEqual(['package', 'delete-agents', 'agent:policy-a', 'agent:policy-b']);
    expect(deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: AGENTS_INDEX,
        conflicts: 'proceed',
        query: { terms: { policy_id: policyIds } },
      })
    );
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        index: AGENTS_INDEX,
        query: assignedAgentsQuery,
      })
    );
    expect(updateByQuery).not.toHaveBeenCalled();
  });

  it('marks surviving active agents inactive before the agent policy delete', async () => {
    const calls: string[] = [];
    const deleteByQuery = jest.fn(async () => {
      calls.push('delete-agents');
      return {};
    });
    const updateByQuery = jest.fn(async () => {
      calls.push('deactivate-agents');
      return {};
    });
    const count = jest.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    await deleteIndexedFleetEndpointPolicies(
      createKbnClient(calls),
      indexData,
      createEsClient({ deleteByQuery, count, updateByQuery })
    );

    expect(calls).toEqual([
      'package',
      'delete-agents',
      'deactivate-agents',
      'agent:policy-a',
      'agent:policy-b',
    ]);
    expect(updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: AGENTS_INDEX,
        conflicts: 'proceed',
        query: assignedAgentsQuery,
        script: { lang: 'painless', source: 'ctx._source.active = false' },
      })
    );
  });

  it('retries five times when agents stay active and then deletes the policy', async () => {
    const calls: string[] = [];
    const deleteByQuery = jest.fn().mockResolvedValue({});
    const updateByQuery = jest.fn().mockResolvedValue({});
    const count = jest.fn().mockResolvedValue({ count: 2 });

    const pending = deleteIndexedFleetEndpointPolicies(
      createKbnClient(calls),
      indexData,
      createEsClient({ deleteByQuery, count, updateByQuery })
    );
    await jest.runAllTimersAsync();
    await pending;

    expect(deleteByQuery).toHaveBeenCalledTimes(5);
    expect(updateByQuery).toHaveBeenCalledTimes(5);
    expect(count).toHaveBeenCalledTimes(10);
    expect(calls).toEqual(['package', 'agent:policy-a', 'agent:policy-b']);
  });

  it('does not delete the agent policy when agent cleanup fails', async () => {
    const calls: string[] = [];
    const deleteByQuery = jest.fn().mockRejectedValue(new Error('es down'));
    const count = jest.fn();
    const updateByQuery = jest.fn();

    await expect(
      deleteIndexedFleetEndpointPolicies(
        createKbnClient(calls),
        indexData,
        createEsClient({ deleteByQuery, count, updateByQuery })
      )
    ).rejects.toBeInstanceOf(EndpointDataLoadingError);

    expect(calls).toEqual(['package']);
    expect(count).not.toHaveBeenCalled();
    expect(updateByQuery).not.toHaveBeenCalled();
  });
});
