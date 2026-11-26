/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import { indexEndpointHostForPolicy } from './index_endpoint_hosts';
import {
  METADATA_DATASTREAM,
  METADATA_UNITED_INDEX,
  metadataCurrentIndexPattern,
} from '../constants';
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

  let esClient: { index: jest.Mock; count: jest.Mock; deleteByQuery: jest.Mock };
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
      count: jest.fn().mockResolvedValue({ count: 0 }),
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

  const deleteQueryFor = (index: unknown) =>
    esClient.deleteByQuery.mock.calls.map(([params]) => params).find((p) => p.index === index) ??
    esClient.deleteByQuery.mock.calls
      .map(([params]) => params)
      .find((p) => JSON.stringify(p.index) === JSON.stringify(index));

  it('rolls back the host document and Fleet agent this call wrote when the transforms are missing', async () => {
    startMetadataTransformsMock.mockRejectedValue(transformsMissingError);

    await expect(callIndexEndpointHostForPolicy()).rejects.toBe(transformsMissingError);

    const indexed = esClient.index.mock.calls[0][0];
    expect(indexed.index).toBe(METADATA_DATASTREAM);

    // The original host document is removed by its own id, not by agent id.
    expect(deleteQueryFor(METADATA_DATASTREAM)).toEqual(
      expect.objectContaining({ query: { ids: { values: [indexed.id] } } })
    );
    // The new host is also removed from each transform destination, by that index's agent id field.
    expect(deleteQueryFor(metadataCurrentIndexPattern)).toEqual(
      expect.objectContaining({ query: { terms: { 'agent.id': [indexed.body.agent.id] } } })
    );
    expect(deleteQueryFor(METADATA_UNITED_INDEX)).toEqual(
      expect.objectContaining({
        query: { terms: { 'united.endpoint.agent.id': [indexed.body.agent.id] } },
      })
    );
    expect(deleteIndexedFleetAgentsMock).toHaveBeenCalledWith(
      esClient,
      expect.objectContaining({
        agents: [{ agent: { id: 'agent-1' } }],
        hosts: [
          expect.objectContaining({
            agent: expect.objectContaining({ id: indexed.body.agent.id }),
          }),
        ],
      })
    );
  });

  it('keeps existing metadata for the agent id when it was there before this call', async () => {
    esClient.count.mockResolvedValue({ count: 3 });
    startMetadataTransformsMock.mockRejectedValue(transformsMissingError);

    await expect(callIndexEndpointHostForPolicy()).rejects.toBe(transformsMissingError);

    const indexed = esClient.index.mock.calls[0][0];
    expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
    expect(deleteQueryFor(METADATA_DATASTREAM)).toEqual(
      expect.objectContaining({ query: { ids: { values: [indexed.id] } } })
    );
  });

  it('treats a failed existing-metadata read as existing metadata and keeps the destinations', async () => {
    esClient.count.mockRejectedValue(new Error('count timed out'));
    startMetadataTransformsMock.mockRejectedValue(transformsMissingError);

    await expect(callIndexEndpointHostForPolicy()).rejects.toBe(transformsMissingError);

    expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
    expect(deleteQueryFor(METADATA_DATASTREAM)).toBeDefined();
  });

  it('finishes deleting the source document before it cleans the destinations', async () => {
    startMetadataTransformsMock.mockRejectedValue(transformsMissingError);
    const order: string[] = [];
    esClient.deleteByQuery.mockImplementation(async ({ index }: { index: unknown }) => {
      order.push(`start:${String(index)}`);
      await new Promise((resolve) => setTimeout(resolve, index === METADATA_DATASTREAM ? 5 : 0));
      order.push(`end:${String(index)}`);
      return {};
    });

    await expect(callIndexEndpointHostForPolicy()).rejects.toBe(transformsMissingError);

    expect(order.indexOf(`end:${METADATA_DATASTREAM}`)).toBeLessThan(
      order.indexOf(`start:${metadataCurrentIndexPattern}`)
    );
  });

  it('still removes the Fleet agent when deleting the metadata fails', async () => {
    startMetadataTransformsMock.mockRejectedValue(transformsMissingError);
    esClient.deleteByQuery.mockRejectedValue(new Error('version conflict'));

    await expect(callIndexEndpointHostForPolicy()).rejects.toBe(transformsMissingError);

    expect(deleteIndexedFleetAgentsMock).toHaveBeenCalledTimes(1);
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
