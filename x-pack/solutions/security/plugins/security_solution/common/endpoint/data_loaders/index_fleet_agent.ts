/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type {
  BulkRequest,
  DeleteByQueryResponse,
  IndexRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { FleetServerAgent } from '@kbn/fleet-plugin/common';
import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';
import type { DeepPartial } from 'utility-types';
import type { ToolingLog } from '@kbn/tooling-log';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { usageTracker } from './usage_tracker';
import type { HostMetadata } from '../types';
import { FleetAgentGenerator } from '../data_generators/fleet_agent_generator';
import { createToolingLogger, wrapErrorAndRejectPromise } from './utils';

const defaultFleetAgentGenerator = new FleetAgentGenerator();

export interface IndexedFleetAgentResponse {
  agents: FleetServerAgent[];
  fleetAgentsIndex: string;
}

/**
 * Indexes a Fleet Agent
 * (NOTE: ensure that fleet is setup first before calling this loading function)
 *
 * @param esClient
 * @param endpointHost
 * @param agentPolicyId
 * @param [kibanaVersion]
 * @param [fleetAgentGenerator]
 */
export const indexFleetAgentForHost = usageTracker.track(
  'indexFleetAgentForHost',
  async (
    esClient: Client,
    endpointHost: HostMetadata,
    agentPolicyId: string,
    kibanaVersion: string = '8.0.0',
    fleetAgentGenerator: FleetAgentGenerator = defaultFleetAgentGenerator,
    spaceId: string | string[] = DEFAULT_SPACE_ID
  ): Promise<IndexedFleetAgentResponse> => {
    const agentDoc = generateFleetAgentEsHitForEndpointHost(
      endpointHost,
      agentPolicyId,
      kibanaVersion,
      fleetAgentGenerator,
      spaceId
    );

    await esClient
      .index<FleetServerAgent>({
        index: agentDoc._index,
        id: agentDoc._id,
        body: agentDoc._source,
        op_type: 'create',
        refresh: 'wait_for',
      })
      .catch(wrapErrorAndRejectPromise);

    return {
      fleetAgentsIndex: agentDoc._index,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      agents: [agentDoc._source!],
    };
  }
);

const generateFleetAgentEsHitForEndpointHost = (
  endpointHost: HostMetadata,
  agentPolicyId: string,
  kibanaVersion: string = '8.0.0',
  fleetAgentGenerator: FleetAgentGenerator = defaultFleetAgentGenerator,
  spaceId: string | string[] = DEFAULT_SPACE_ID
) => {
  const esHit = fleetAgentGenerator.generateEsHit({
    _id: endpointHost.agent.id,
    _source: {
      agent: {
        id: endpointHost.agent.id,
        version: endpointHost.agent.version,
      },
      local_metadata: {
        elastic: {
          agent: {
            id: endpointHost.agent.id,
            version: kibanaVersion,
          },
        },
        host: {
          ...endpointHost.host,
        },
        os: {
          ...endpointHost.host.os,
        },
      },
      policy_id: agentPolicyId,
      namespaces: Array.isArray(spaceId) ? spaceId : [spaceId],
    },
  });

  // Set the agent status to Healthy
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  esHit._source!.components = [
    {
      id: 'endpoint-0',
      type: 'endpoint',
      status: 'HEALTHY',
      message: 'Running as external service',
      units: [
        {
          id: 'endpoint-1',
          type: 'input',
          status: 'HEALTHY',
          message: 'Protecting machine',
        },
        {
          id: 'shipper',
          type: 'output',
          status: 'HEALTHY',
          message: 'Connected over GRPC',
        },
      ],
    },
  ];

  return esHit;
};

interface BuildFleetAgentBulkCreateOperationsOptions {
  endpoints: HostMetadata[];
  agentPolicyId: string;
  kibanaVersion?: string;
  spaceId?: string;
  fleetAgentGenerator?: FleetAgentGenerator;
}

export interface BuildFleetAgentBulkCreateOperationsResponse extends IndexedFleetAgentResponse {
  operations: Required<BulkRequest>['operations'];
}

/**
 * Creates an array of ES records with Fleet Agents that are associated with the provided set of Endpoint Agents.
 * Array can be used with the `bulk()` API's `operations` option.
 * @param endpoints
 * @param agentPolicyId
 * @param kibanaVersion
 * @param fleetAgentGenerator
 */
export const buildFleetAgentBulkCreateOperations = ({
  endpoints,
  agentPolicyId,
  kibanaVersion = '8.0.0',
  fleetAgentGenerator = defaultFleetAgentGenerator,
  spaceId = DEFAULT_SPACE_ID,
}: BuildFleetAgentBulkCreateOperationsOptions): BuildFleetAgentBulkCreateOperationsResponse => {
  const response: BuildFleetAgentBulkCreateOperationsResponse = {
    operations: [],
    agents: [],
    fleetAgentsIndex: AGENTS_INDEX,
  };

  for (const endpointHost of endpoints) {
    const agentDoc = generateFleetAgentEsHitForEndpointHost(
      endpointHost,
      agentPolicyId,
      kibanaVersion,
      fleetAgentGenerator,
      spaceId
    );

    response.operations.push(
      { create: { _index: agentDoc._index, _id: agentDoc._id } },
      agentDoc._source
    );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    response.agents.push(agentDoc._source!);
  }

  return response;
};

export interface DeleteIndexedFleetAgentsResponse {
  agents: DeleteByQueryResponse | undefined;
}

export const deleteIndexedFleetAgents = async (
  esClient: Client,
  indexedData: IndexedFleetAgentResponse
): Promise<DeleteIndexedFleetAgentsResponse> => {
  const response: DeleteIndexedFleetAgentsResponse = {
    agents: undefined,
  };

  if (indexedData.agents.length) {
    response.agents = await esClient
      .deleteByQuery({
        index: `${indexedData.fleetAgentsIndex}-*`,
        wait_for_completion: true,
        conflicts: 'proceed',
        query: {
          bool: {
            filter: [
              {
                terms: {
                  'local_metadata.elastic.agent.id': indexedData.agents.map(
                    (agent) => agent.local_metadata.elastic.agent.id
                  ),
                },
              },
            ],
          },
        },
      })
      .catch(wrapErrorAndRejectPromise);
  }

  return response;
};

export const indexFleetServerAgent = async (
  esClient: Client,
  log: ToolingLog = createToolingLogger(),
  overrides: DeepPartial<FleetServerAgent> = {}
): Promise<IndexedFleetAgentResponse> => {
  const doc = defaultFleetAgentGenerator.generateEsHit({
    _source: overrides,
  });

  const indexRequest: IndexRequest<FleetServerAgent> = {
    index: doc._index,
    id: doc._id,
    body: doc._source,
    op_type: 'create',
    refresh: 'wait_for',
  };

  log.verbose(`Indexing new fleet agent with:\n${JSON.stringify(indexRequest, null, 2)}`);

  await esClient.index<FleetServerAgent>(indexRequest).catch(wrapErrorAndRejectPromise);

  return {
    fleetAgentsIndex: doc._index,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    agents: [doc._source!],
  };
};
