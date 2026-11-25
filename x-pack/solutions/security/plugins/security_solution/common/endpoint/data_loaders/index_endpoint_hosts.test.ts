/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { DeleteByQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import type { KbnClient } from '@kbn/test';
import type { CreatePackagePolicyResponse, GetInfoResponse } from '@kbn/fleet-plugin/common';
import { EndpointDocGenerator } from '../generate_data';
import { EndpointError } from '../errors';
import { METADATA_UNITED_INDEX } from '../constants';
import {
  buildIndexHostsResponse,
  deleteIndexedEndpointHosts,
  indexEndpointHostDocs,
} from './index_endpoint_hosts';
import type { IndexedFleetEndpointPolicyResponse } from './index_fleet_endpoint_policy';
import {
  deleteIndexedFleetEndpointPolicies,
  indexFleetEndpointPolicy,
} from './index_fleet_endpoint_policy';

jest.mock('./index_fleet_endpoint_policy');

const metadataIndex = 'metrics-endpoint.metadata-default';
const policyResponseIndex = 'metrics-endpoint.policy-default';
const fleetAgentsIndex = '.fleet-agents';

const createdPolicies = {
  integrationPolicies: [{ id: 'integration-policy-1', policy_ids: ['agent-policy-1'] }],
  agentPolicies: [{ id: 'agent-policy-1' }],
} as unknown as IndexedFleetEndpointPolicyResponse;

const createKbnClient = (): KbnClient =>
  ({
    request: jest.fn(async ({ path }: { path: string }) => {
      if (path === '/api/status') {
        return { data: { version: { number: '9.0.0' } } };
      }
      return { data: { id: 'default' } };
    }),
  } as unknown as KbnClient);

const createEsClient = ({
  bulk,
  deleteByQuery = jest.fn().mockResolvedValue({ deleted: 0, version_conflicts: 0 }),
}: {
  bulk: jest.Mock;
  deleteByQuery?: jest.Mock;
}): Client =>
  ({
    bulk,
    deleteByQuery,
    count: jest.fn().mockResolvedValue({ count: 0 }),
    updateByQuery: jest.fn().mockResolvedValue({}),
    indices: { refresh: jest.fn().mockResolvedValue({}) },
  } as unknown as Client);

const runIndexEndpointHostDocs = (client: Client, kbnClient: KbnClient) =>
  indexEndpointHostDocs({
    numDocs: 1,
    client,
    kbnClient,
    realPolicies: {} as Record<string, CreatePackagePolicyResponse['item']>,
    epmEndpointPackage: { version: '9.0.0' } as GetInfoResponse['item'],
    metadataIndex,
    policyResponseIndex,
    enrollFleet: true,
    generator: new EndpointDocGenerator('seed'),
  });

const deletedIndices = (deleteByQuery: jest.Mock): Array<DeleteByQueryRequest['index']> =>
  deleteByQuery.mock.calls.map(([request]: [DeleteByQueryRequest]) => request.index);

describe('indexEndpointHostDocs', () => {
  beforeEach(() => {
    jest.mocked(indexFleetEndpointPolicy).mockResolvedValue(createdPolicies);
    jest.mocked(deleteIndexedFleetEndpointPolicies).mockResolvedValue({
      integrationPolicies: undefined,
      agentPolicies: undefined,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('does not roll back when the bulk succeeds', async () => {
    const deleteByQuery = jest.fn();
    const client = createEsClient({
      bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
      deleteByQuery,
    });

    const response = await runIndexEndpointHostDocs(client, createKbnClient());

    expect(response.hosts).toHaveLength(1);
    expect(response.agents).toHaveLength(1);
    expect(deleteByQuery).not.toHaveBeenCalled();
    expect(deleteIndexedFleetEndpointPolicies).not.toHaveBeenCalled();
  });

  it('rolls back the host and rethrows when the bulk reports item errors', async () => {
    const deleteByQuery = jest.fn().mockResolvedValue({ deleted: 0, version_conflicts: 0 });
    const client = createEsClient({
      bulk: jest.fn().mockResolvedValue({ errors: true, items: [] }),
      deleteByQuery,
    });

    await expect(runIndexEndpointHostDocs(client, createKbnClient())).rejects.toBeInstanceOf(
      EndpointError
    );

    expect(deletedIndices(deleteByQuery)).toEqual(
      expect.arrayContaining([metadataIndex, [fleetAgentsIndex, `${fleetAgentsIndex}-*`]])
    );
    expect(deleteIndexedFleetEndpointPolicies).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining(createdPolicies)
    );
  });

  it('rolls back the host and rethrows when the bulk request rejects', async () => {
    const deleteByQuery = jest.fn().mockResolvedValue({ deleted: 0, version_conflicts: 0 });
    const client = createEsClient({
      bulk: jest.fn().mockRejectedValue(new Error('bulk rejected')),
      deleteByQuery,
    });

    await expect(runIndexEndpointHostDocs(client, createKbnClient())).rejects.toThrow(
      'bulk rejected'
    );

    expect(deletedIndices(deleteByQuery)).toEqual(
      expect.arrayContaining([metadataIndex, [fleetAgentsIndex, `${fleetAgentsIndex}-*`]])
    );
    expect(deleteIndexedFleetEndpointPolicies).toHaveBeenCalled();
  });

  it('rethrows the original error when the rollback fails', async () => {
    const client = createEsClient({
      bulk: jest.fn().mockResolvedValue({ errors: true, items: [] }),
      deleteByQuery: jest.fn().mockRejectedValue(new Error('rollback failed')),
    });

    await expect(runIndexEndpointHostDocs(client, createKbnClient())).rejects.toBeInstanceOf(
      EndpointError
    );
  });

  it('reaches the Fleet agent and policy cleanup when the metadata data streams do not exist', async () => {
    const deleteByQuery = jest.fn(async (request: DeleteByQueryRequest) => {
      if (
        (request.index === metadataIndex || request.index === policyResponseIndex) &&
        !request.ignore_unavailable
      ) {
        throw new Error('index_not_found_exception');
      }
      return { deleted: 0, version_conflicts: 0 };
    });
    const client = createEsClient({
      bulk: jest.fn().mockRejectedValue(new Error('bulk rejected')),
      deleteByQuery,
    });

    await expect(runIndexEndpointHostDocs(client, createKbnClient())).rejects.toThrow(
      'bulk rejected'
    );

    expect(deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ index: metadataIndex, ignore_unavailable: true })
    );
    expect(deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ index: policyResponseIndex, ignore_unavailable: true })
    );
    expect(deletedIndices(deleteByQuery)).toContainEqual([
      fleetAgentsIndex,
      `${fleetAgentsIndex}-*`,
    ]);
    expect(deleteIndexedFleetEndpointPolicies).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining(createdPolicies)
    );
  });
});

describe('deleteIndexedEndpointHosts', () => {
  beforeEach(() => {
    jest.mocked(indexFleetEndpointPolicy).mockResolvedValue(createdPolicies);
    jest.mocked(deleteIndexedFleetEndpointPolicies).mockResolvedValue({
      integrationPolicies: undefined,
      agentPolicies: undefined,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('deletes the seeded hosts from the united metadata index after the Fleet agents', async () => {
    const deleteByQuery = jest.fn().mockResolvedValue({ deleted: 0, version_conflicts: 0 });
    const client = createEsClient({
      bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
      deleteByQuery,
    });
    const indexedData = await runIndexEndpointHostDocs(client, createKbnClient());
    const agentIds = indexedData.hosts.map((host) => host.agent.id);

    await deleteIndexedEndpointHosts(client, createKbnClient(), indexedData);

    expect(deleteByQuery).toHaveBeenCalledWith({
      index: METADATA_UNITED_INDEX,
      wait_for_completion: true,
      ignore_unavailable: true,
      conflicts: 'proceed',
      query: { bool: { filter: [{ terms: { 'agent.id': agentIds } }] } },
    });
    const indices = deletedIndices(deleteByQuery);
    expect(indices.indexOf(METADATA_UNITED_INDEX)).toBeGreaterThan(
      indices.findIndex((index) => Array.isArray(index) && index.includes(fleetAgentsIndex))
    );
  });

  it('does not delete from the united metadata index when no hosts were indexed', async () => {
    const deleteByQuery = jest.fn().mockResolvedValue({ deleted: 0, version_conflicts: 0 });
    const client = createEsClient({ bulk: jest.fn(), deleteByQuery });

    await deleteIndexedEndpointHosts(client, createKbnClient(), buildIndexHostsResponse());

    expect(deletedIndices(deleteByQuery)).not.toContain(METADATA_UNITED_INDEX);
  });
});
