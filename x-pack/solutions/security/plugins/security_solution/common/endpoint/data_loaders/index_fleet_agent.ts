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
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { FleetServerAgent } from '@kbn/fleet-plugin/common';
import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';
import type { DeepPartial } from 'utility-types';
import type { ToolingLog } from '@kbn/tooling-log';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { usageTracker } from './usage_tracker';
import type { HostMetadata } from '../types';
import { FleetAgentGenerator } from '../data_generators/fleet_agent_generator';
import { createToolingLogger, EndpointDataLoadingError, wrapErrorAndRejectPromise } from './utils';

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
    const agentIds = indexedData.agents.map((agent) => agent.local_metadata.elastic.agent.id);
    // Documents are indexed into `.fleet-agents`. The legacy `-*` name only matches
    // older versioned indices, so a delete against that pattern can leave the agents
    // in place. Fleet then rejects the agent policy delete while any active agent remains.
    const query: QueryDslQueryContainer = {
      bool: {
        filter: [{ terms: { 'local_metadata.elastic.agent.id': agentIds } }],
      },
    };
    const index = [indexedData.fleetAgentsIndex, `${indexedData.fleetAgentsIndex}-*`];
    const countAgents = () =>
      esClient
        .count({
          index,
          ignore_unavailable: true,
          expand_wildcards: 'all',
          query,
        })
        .catch(wrapErrorAndRejectPromise);

    // Fleet rewrites these docs while a test is cleaning up. With
    // `conflicts: 'proceed'` that rewrite is skipped. When every hit conflicts,
    // `refresh: true` does not refresh the index, so the next attempt can read
    // the same version. Refresh the concrete index before retrying.
    let deleted: DeleteByQueryResponse | undefined;
    for (let attempt = 0; attempt < 5; attempt++) {
      deleted = await esClient
        .deleteByQuery({
          index,
          wait_for_completion: true,
          conflicts: 'proceed',
          refresh: true,
          ignore_unavailable: true,
          expand_wildcards: 'all',
          query,
        })
        .catch(wrapErrorAndRejectPromise);

      const remaining = await countAgents();
      if ((deleted.version_conflicts ?? 0) === 0 && remaining.count === 0) {
        break;
      }

      // The refresh only lets the next delete see a new version. A failed
      // refresh must not end the retry or replace the conflict error.
      await esClient.indices
        .refresh({
          index,
          ignore_unavailable: true,
          expand_wildcards: 'all',
        })
        .catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const versionConflicts = deleted?.version_conflicts ?? 0;
    const remaining = await countAgents();
    if (versionConflicts > 0 || remaining.count > 0) {
      const ids = agentIds.join(', ');
      createToolingLogger().warning(
        `Failed to delete seeded Fleet agents [${ids}] ` +
          `(${versionConflicts} version conflict(s), ${remaining.count} document(s) left). ` +
          'Marking them inactive so the agent policy can be removed.'
      );
      await esClient
        .updateByQuery({
          index,
          refresh: true,
          conflicts: 'proceed',
          ignore_unavailable: true,
          expand_wildcards: 'all',
          query,
          script: {
            source: 'ctx._source.active = false',
            lang: 'painless',
          },
        })
        .catch(wrapErrorAndRejectPromise);

      const stillActive = await esClient
        .count({
          index,
          ignore_unavailable: true,
          expand_wildcards: 'all',
          query: {
            bool: {
              filter: [
                query,
                {
                  bool: {
                    should: [{ term: { active: true } }, { term: { active: 'true' } }],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        })
        .catch(wrapErrorAndRejectPromise);
      if (stillActive.count > 0) {
        throw new EndpointDataLoadingError(
          `Failed to delete or deactivate ${stillActive.count} seeded Fleet agents [${ids}]`
        );
      }
    }

    response.agents = deleted;
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
