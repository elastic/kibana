/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import { indexEndpointHostForPolicy } from './index_endpoint_hosts';
import { startMetadataTransforms, stopMetadataTransforms } from '../utils/transforms';
import { deleteIndexedFleetAgents, indexFleetAgentForHost } from './index_fleet_agent';
import { deleteIndexedEndpointAndFleetActions } from './index_endpoint_fleet_actions';
import { deleteIndexedFleetEndpointPolicies } from './index_fleet_endpoint_policy';

jest.mock('../utils/transforms');
jest.mock('./index_fleet_agent');
jest.mock('./index_endpoint_fleet_actions');
jest.mock('./index_fleet_endpoint_policy');

describe('indexEndpointHostForPolicy', () => {
  const startMetadataTransformsMock = startMetadataTransforms as jest.Mock;
  const stopMetadataTransformsMock = stopMetadataTransforms as jest.Mock;
  const indexFleetAgentForHostMock = indexFleetAgentForHost as jest.Mock;
  const deleteIndexedFleetAgentsMock = deleteIndexedFleetAgents as jest.Mock;
  const transformsMissingError = new Error(
    'Metadata transforms for endpoint package version [9.0.0] not found after waiting; endpoint metadata is unavailable'
  );

  let esClient: { index: jest.Mock; deleteByQuery: jest.Mock };
  let kbnClient: { request: jest.Mock };

  const callIndexEndpointHostForPolicy = () =>
    indexEndpointHostForPolicy({
      esClient: esClient as unknown as Client,
      kbnClient: kbnClient as unknown as KbnClient,
      integrationPolicyId: 'integration-policy-1',
    });

  beforeEach(() => {
    esClient = {
      index: jest.fn().mockResolvedValue({}),
      deleteByQuery: jest.fn().mockResolvedValue({}),
    };
    kbnClient = {
      request: jest.fn(async ({ path }: { path: string }) => {
        if (path === '/api/status') {
          return { data: { version: { number: '9.0.0' } } };
        }

        if (path.includes('package_policies')) {
          return {
            data: {
              item: {
                id: 'integration-policy-1',
                name: 'endpoint-policy',
                revision: 1,
                policy_ids: ['agent-policy-1'],
                package: { version: '9.0.0' },
              },
            },
          };
        }

        return { data: { item: { id: 'agent-policy-1', space_ids: ['default'] } } };
      }),
    };

    stopMetadataTransformsMock.mockResolvedValue(undefined);
    startMetadataTransformsMock.mockResolvedValue(undefined);
    indexFleetAgentForHostMock.mockResolvedValue({
      fleetAgentsIndex: '.fleet-agents',
      agents: [{ agent: { id: 'agent-1' } }],
    });
    deleteIndexedFleetAgentsMock.mockResolvedValue({});
    (deleteIndexedEndpointAndFleetActions as jest.Mock).mockResolvedValue({});
    (deleteIndexedFleetEndpointPolicies as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns the indexed data without cleaning up when the transforms start', async () => {
    const response = await callIndexEndpointHostForPolicy();

    expect(response.hosts).toHaveLength(1);
    expect(response.agents).toHaveLength(1);
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    expect(deleteIndexedFleetAgentsMock).not.toHaveBeenCalled();
  });

  it('rolls back the indexed host and Fleet agent when the metadata transforms are missing', async () => {
    startMetadataTransformsMock.mockRejectedValue(transformsMissingError);

    await expect(callIndexEndpointHostForPolicy()).rejects.toBe(transformsMissingError);

    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { bool: { filter: [{ terms: { 'agent.id': [expect.any(String)] } }] } },
      })
    );
    expect(deleteIndexedFleetAgentsMock).toHaveBeenCalledWith(
      esClient,
      expect.objectContaining({
        agents: [{ agent: { id: 'agent-1' } }],
        hosts: [
          expect.objectContaining({ agent: expect.objectContaining({ id: expect.any(String) }) }),
        ],
      })
    );
  });

  it('does not try to clean up when nothing was indexed yet', async () => {
    indexFleetAgentForHostMock.mockRejectedValue(new Error('fleet agent index failed'));

    await expect(callIndexEndpointHostForPolicy()).rejects.toThrow('fleet agent index failed');

    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    expect(deleteIndexedFleetAgentsMock).not.toHaveBeenCalled();
  });

  it('rethrows the original error when the cleanup itself fails', async () => {
    startMetadataTransformsMock.mockRejectedValue(transformsMissingError);
    esClient.deleteByQuery.mockRejectedValue(new Error('cleanup failed'));

    await expect(callIndexEndpointHostForPolicy()).rejects.toBe(transformsMissingError);
  });
});
