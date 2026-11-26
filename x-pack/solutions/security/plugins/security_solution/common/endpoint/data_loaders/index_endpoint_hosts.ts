/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { cloneDeep, merge } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import type { KbnClient, KbnClientResponse } from '@kbn/test';
import type { BulkRequest, DeleteByQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type {
  CreatePackagePolicyResponse,
  GetInfoResponse,
  GetOneAgentPolicyResponse,
  GetOnePackagePolicyResponse,
} from '@kbn/fleet-plugin/common';
import { agentPolicyRouteService, packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import type { DeepPartial } from 'utility-types';
import type { ToolingLog } from '@kbn/tooling-log';
import { startMetadataTransforms, stopMetadataTransforms } from '../utils/transforms';
import { catchHttpErrorFormatAndThrow } from '../format_http_error';
import { EndpointError } from '../errors';
import { usageTracker } from './usage_tracker';
import { EndpointDocGenerator } from '../generate_data';
import type { HostMetadata, HostMetadataInterface, HostPolicyResponse } from '../types';
import { HostPolicyResponseActionStatus } from '../types';
import type {
  BuildFleetAgentBulkCreateOperationsResponse,
  DeleteIndexedFleetAgentsResponse,
  IndexedFleetAgentResponse,
} from './index_fleet_agent';
import {
  buildFleetAgentBulkCreateOperations,
  deleteIndexedFleetAgents,
  indexFleetAgentForHost,
} from './index_fleet_agent';
import {
  buildIEndpointAndFleetActionsBulkOperations,
  deleteIndexedEndpointAndFleetActions,
  type IndexEndpointAndFleetActionsForHostOptions,
  type DeleteIndexedEndpointFleetActionsResponse,
  type IndexedEndpointAndFleetActionsForHostResponse,
} from './index_endpoint_fleet_actions';

import type {
  DeleteIndexedFleetEndpointPoliciesResponse,
  IndexedFleetEndpointPolicyResponse,
} from './index_fleet_endpoint_policy';
import {
  deleteIndexedFleetEndpointPolicies,
  indexFleetEndpointPolicy,
} from './index_fleet_endpoint_policy';
import {
  METADATA_DATASTREAM,
  METADATA_UNITED_INDEX,
  metadataCurrentIndexPattern,
  POLICY_RESPONSE_INDEX,
} from '../constants';
import {
  createToolingLogger,
  EndpointDataLoadingError,
  fetchActiveSpaceId,
  mergeAndAppendArrays,
  wrapErrorAndRejectPromise,
} from './utils';

export interface IndexedHostsResponse
  extends IndexedFleetAgentResponse,
    IndexedEndpointAndFleetActionsForHostResponse,
    IndexedFleetEndpointPolicyResponse {
  /**
   * The documents (1 or more) that were generated for the (single) endpoint host.
   * If consuming this data and wanting only the last one created, just access the
   * last item in the array
   */
  hosts: HostMetadata[];

  /**
   * The list of Endpoint Policy Response documents (1 or more) that was created.
   */
  policyResponses: HostPolicyResponse[];

  metadataIndex: string;
  policyResponseIndex: string;
}

export const buildIndexHostsResponse = (): IndexedHostsResponse => {
  return {
    hosts: [],
    agents: [],
    policyResponses: [],
    metadataIndex: METADATA_DATASTREAM,
    policyResponseIndex: POLICY_RESPONSE_INDEX,
    fleetAgentsIndex: '',
    endpointActionResponses: [],
    endpointActionResponsesIndex: '',
    endpointActions: [],
    endpointActionsIndex: '',
    actionResponses: [],
    responsesIndex: '',
    actions: [],
    actionsIndex: '',
    integrationPolicies: [],
    agentPolicies: [],
  };
};

/**
 * Indexes the requested number of documents for the endpoint host metadata currently being output by the generator.
 * Endpoint Host metadata documents are added to an index that is set as "append only", thus one Endpoint host could
 * have multiple documents in that index.
 *
 * @param numDocs
 * @param client
 * @param kbnClient
 * @param realPolicies
 * @param epmEndpointPackage
 * @param metadataIndex
 * @param policyResponseIndex
 * @param enrollFleet
 * @param generator
 * @param disableEndpointActionsForHost
 */
export const indexEndpointHostDocs = usageTracker.track(
  'indexEndpointHostDocs',
  async ({
    numDocs,
    client,
    kbnClient,
    realPolicies,
    epmEndpointPackage,
    metadataIndex,
    policyResponseIndex,
    enrollFleet,
    generator,
    withResponseActions = true,
    numResponseActions = 1,
    alertIds,
    responseState,
  }: {
    numDocs: number;
    client: Client;
    kbnClient: KbnClient;
    realPolicies: Record<string, CreatePackagePolicyResponse['item']>;
    epmEndpointPackage: GetInfoResponse['item'];
    metadataIndex: string;
    policyResponseIndex: string;
    enrollFleet: boolean;
    generator: EndpointDocGenerator;
    withResponseActions?: boolean;
    numResponseActions?: IndexEndpointAndFleetActionsForHostOptions['numResponseActions'];
    alertIds?: string[];
    responseState?: IndexEndpointAndFleetActionsForHostOptions['responseState'];
  }): Promise<IndexedHostsResponse> => {
    const timeBetweenDocs = 6 * 3600 * 1000; // 6 hours between metadata documents
    const timestamp = new Date().getTime();
    const kibanaVersion = await fetchKibanaVersion(kbnClient);
    const activeSpaceId = await fetchActiveSpaceId(kbnClient);
    const response: IndexedHostsResponse = buildIndexHostsResponse();

    response.metadataIndex = metadataIndex;
    response.policyResponseIndex = policyResponseIndex;

    let hostMetadata: HostMetadata;
    let wasAgentEnrolled = false;

    const bulkOperations: BulkRequest['operations'] = [];

    try {
      for (let j = 0; j < numDocs; j++) {
        generator.updateHostData();
        generator.updateHostPolicyData({ excludeInitialPolicy: true });

        hostMetadata = generator.generateHostMetadata(
          timestamp - timeBetweenDocs * (numDocs - j - 1),
          EndpointDocGenerator.createDataStreamFromIndex(metadataIndex)
        );
        let agentId = hostMetadata.agent.id;

        if (enrollFleet) {
          const { id: appliedPolicyId, name: appliedPolicyName } =
            hostMetadata.Endpoint.policy.applied;
          const uniqueAppliedPolicyName = `${appliedPolicyName}-${uuidv4()}`;

          // If we don't yet have a "real" policy record, then create it now in ingest (package config)
          if (!realPolicies[appliedPolicyId]) {
            const createdPolicies = await indexFleetEndpointPolicy(
              kbnClient,
              uniqueAppliedPolicyName,
              epmEndpointPackage.version
            );

            mergeAndAppendArrays(response, createdPolicies);

            // eslint-disable-next-line @kbn/compat/eslint-require-atomic-updates
            realPolicies[appliedPolicyId] = createdPolicies.integrationPolicies[0];
          }

          // If we did not yet enroll an agent for this Host, do it now that we have good policy id
          if (!wasAgentEnrolled) {
            wasAgentEnrolled = true;

            const agentOperations: BuildFleetAgentBulkCreateOperationsResponse = {
              agents: [],
              fleetAgentsIndex: '',
              operations: [],
            };

            realPolicies[appliedPolicyId].policy_ids.forEach((policyId) => {
              const { agents, fleetAgentsIndex, operations } = buildFleetAgentBulkCreateOperations({
                endpoints: [hostMetadata],
                agentPolicyId: policyId,
                spaceId: activeSpaceId,
                kibanaVersion,
              });

              agentOperations.agents = [...agentOperations.agents, ...agents];
              agentOperations.fleetAgentsIndex = fleetAgentsIndex;
              agentOperations.operations = [...agentOperations.operations, ...operations];
            });

            bulkOperations.push(...agentOperations.operations);
            agentId = agentOperations.agents[0]?.agent?.id ?? agentId;

            mergeAndAppendArrays(response, {
              agents: agentOperations.agents,
              fleetAgentsIndex: agentOperations.fleetAgentsIndex,
            });
          }

          // Update the Host metadata record with the ID of the "real" policy along with the enrolled agent id
          hostMetadata = {
            ...hostMetadata,
            agent: {
              ...hostMetadata.agent,
              id: agentId,
            },
            elastic: {
              ...hostMetadata.elastic,
              agent: {
                ...hostMetadata.elastic.agent,
                id: agentId,
              },
            },
            Endpoint: {
              ...hostMetadata.Endpoint,
              policy: {
                ...hostMetadata.Endpoint.policy,
                applied: {
                  ...hostMetadata.Endpoint.policy.applied,
                  id: realPolicies[appliedPolicyId].id,
                },
              },
            },
          };

          // Create some fleet endpoint actions and .logs-endpoint actions for this Host
          if (withResponseActions) {
            // `count` logic matches that of `indexEndpointAndFleetActionsForHost()`. Unclear why the number of
            // actions to create will be 5 more than the amount requested if that amount was grater than 1
            const count =
              numResponseActions === 1
                ? numResponseActions
                : generator.randomN(5) + numResponseActions;

            const { operations, ...indexFleetActions } =
              buildIEndpointAndFleetActionsBulkOperations({
                endpoints: [hostMetadata],
                count,
                alertIds,
                responseState,
              });

            bulkOperations.push(...operations);
            mergeAndAppendArrays(response, indexFleetActions);
          }
        }

        bulkOperations.push({ create: { _index: metadataIndex } }, hostMetadata);

        const hostPolicyResponse = generator.generatePolicyResponse({
          ts: timestamp - timeBetweenDocs * (numDocs - j - 1),
          policyDataStream: EndpointDocGenerator.createDataStreamFromIndex(policyResponseIndex),
        });

        bulkOperations.push({ create: { _index: policyResponseIndex } }, hostPolicyResponse);

        // Clone the hostMetadata and policyResponse document to ensure that no shared state
        // (as a result of using the generator) is returned across docs.
        response.hosts.push(cloneDeep(hostMetadata));
        response.policyResponses.push(cloneDeep(hostPolicyResponse));
      }

      const bulkResponse = await client
        .bulk(
          { operations: bulkOperations, refresh: 'wait_for' },
          { headers: { 'X-elastic-product-origin': 'fleet' } }
        )
        .catch(wrapErrorAndRejectPromise);

      if (bulkResponse.errors) {
        throw new EndpointError(
          `indexEndpointHostDocs(): ES Bulk action failed\n\n${JSON.stringify(
            bulkResponse,
            null,
            2
          )}`,
          bulkResponse
        );
      }
    } catch (error) {
      // `response` already lists every policy and doc id queued for this host, so roll
      // them back here: callers never receive `response` when this function throws.
      await deleteIndexedEndpointHosts(client, kbnClient, response).catch(() => undefined);
      throw error;
    }

    return response;
  }
);

const fetchKibanaVersion = async (kbnClient: KbnClient) => {
  const version = (
    (await kbnClient.request({
      path: '/api/status',
      method: 'GET',
    })) as KbnClientResponse<{ version: { number: string } }>
  ).data.version.number;

  if (!version) {
    throw new EndpointDataLoadingError('failed to get kibana version via `/api/status` api');
  }

  return version;
};

export interface DeleteIndexedEndpointHostsResponse
  extends DeleteIndexedFleetAgentsResponse,
    DeleteIndexedEndpointFleetActionsResponse,
    DeleteIndexedFleetEndpointPoliciesResponse {
  hosts: DeleteByQueryResponse | undefined;
  policyResponses: DeleteByQueryResponse | undefined;
}

export const deleteIndexedEndpointHosts = async (
  esClient: Client,
  kbnClient: KbnClient,
  indexedData: IndexedHostsResponse | undefined
): Promise<DeleteIndexedEndpointHostsResponse> => {
  const response: DeleteIndexedEndpointHostsResponse = {
    hosts: undefined,
    policyResponses: undefined,
    agents: undefined,
    responses: undefined,
    actions: undefined,
    endpointActionRequests: undefined,
    endpointActionResponses: undefined,
    integrationPolicies: undefined,
    agentPolicies: undefined,
  };

  if (!indexedData) {
    return response;
  }

  const hostsQuery = {
    bool: {
      filter: [{ terms: { 'agent.id': indexedData.hosts.map((host) => host.agent.id) } }],
    },
  };

  if (indexedData.hosts.length) {
    response.hosts = await esClient
      .deleteByQuery({
        index: indexedData.metadataIndex,
        wait_for_completion: true,
        // The rollback in `indexEndpointHostDocs` can run before the bulk created this data stream.
        ignore_unavailable: true,
        query: hostsQuery,
      })
      .catch(wrapErrorAndRejectPromise);

    // Delete from the transform destination index
    await esClient
      .deleteByQuery({
        index: metadataCurrentIndexPattern,
        wait_for_completion: true,
        query: hostsQuery,
      })
      .catch(wrapErrorAndRejectPromise);
  }

  if (indexedData.policyResponses.length) {
    response.policyResponses = await esClient
      .deleteByQuery({
        index: indexedData.policyResponseIndex,
        wait_for_completion: true,
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [
              {
                terms: {
                  'agent.id': indexedData.policyResponses.map(
                    (policyResponse) => policyResponse.agent.id
                  ),
                },
              },
            ],
          },
        },
      })
      .catch(wrapErrorAndRejectPromise);
  }

  mergeAndAppendArrays(response, await deleteIndexedFleetAgents(esClient, indexedData));

  // The united transform does not prune its destination when source docs are deleted.
  // Delete after the Fleet agents so the transform has no active agent to re-materialize.
  if (indexedData.hosts.length) {
    await esClient
      .deleteByQuery({
        index: METADATA_UNITED_INDEX,
        wait_for_completion: true,
        ignore_unavailable: true,
        conflicts: 'proceed',
        query: hostsQuery,
      })
      .catch(wrapErrorAndRejectPromise);
  }

  mergeAndAppendArrays(response, await deleteIndexedEndpointAndFleetActions(esClient, indexedData));
  mergeAndAppendArrays(response, await deleteIndexedFleetEndpointPolicies(kbnClient, indexedData));

  return response;
};

interface IndexEndpointHostForPolicyOptions {
  esClient: Client;
  kbnClient: KbnClient;
  /** The Endpoint integration policy ID that should be used to index new Endpoint host */
  integrationPolicyId: string;
  /**
   * The Fleet agent policy ID. By default, the first agent policy ID listed in the Integration Policy will be used,
   * but since an Integration policy can be shared with multiple agent policies, this options can be used to target
   * a specific one.
   */
  agentPolicyId?: string;
  overrides?: DeepPartial<HostMetadataInterface>;
  logger?: ToolingLog;
}
/**
 * Indexes a new Endpoint host for a given policy (Endpoint integration policy).
 *
 * NOTE: consider stopping the Endpoint metadata
 */
export const indexEndpointHostForPolicy = async ({
  esClient,
  kbnClient,
  integrationPolicyId,
  agentPolicyId,
  overrides = {},
  logger = createToolingLogger(),
}: IndexEndpointHostForPolicyOptions): Promise<IndexedHostsResponse> => {
  const response: IndexedHostsResponse = buildIndexHostsResponse();
  const [kibanaVersion, integrationPolicy] = await Promise.all([
    fetchKibanaVersion(kbnClient),
    kbnClient
      .request<GetOnePackagePolicyResponse>({
        path: packagePolicyRouteService.getInfoPath(integrationPolicyId),
        method: 'GET',
        headers: { 'elastic-api-version': '2023-10-31' },
      })
      .catch(catchHttpErrorFormatAndThrow)
      .then((res) => res.data.item),
  ]);

  logger.verbose(`Integration policy:\n${JSON.stringify(integrationPolicy, null, 2)}`);

  if (agentPolicyId && !integrationPolicy.policy_ids.includes(agentPolicyId)) {
    throw new EndpointError(
      `indexEndpointHostForPolicy(): Invalid agent policy id [${agentPolicyId}]. Agent policy id not listed in integration policy`
    );
  }

  const agentPolicy = await kbnClient
    .request<GetOneAgentPolicyResponse>({
      method: 'GET',
      path: agentPolicyRouteService.getInfoPath(agentPolicyId ?? integrationPolicy.policy_ids[0]),
      headers: { 'elastic-api-version': '2023-10-31' },
    })
    .then((res) => res.data.item);

  logger.verbose(`Agent policy:\n${JSON.stringify(agentPolicy, null, 2)}`);

  const timestamp = Date.now() - 3.6e6; // Subtract 1 hour

  const docOverrides: DeepPartial<HostMetadataInterface> = merge({
    '@timestamp': timestamp,
    agent: {
      version: kibanaVersion,
    },
    Endpoint: {
      policy: {
        applied: {
          name: integrationPolicy.name,
          id: integrationPolicy.id,
          endpoint_policy_version: integrationPolicy.revision,
          status: HostPolicyResponseActionStatus.success,
        },
      },
    },
    ...overrides,
  });

  const hostMetadataDoc = merge(
    new EndpointDocGenerator().generateHostMetadata(
      undefined,
      EndpointDocGenerator.createDataStreamFromIndex(METADATA_DATASTREAM)
    ),
    docOverrides
  );

  logger.verbose(
    `New endpoint host metadata doc to be indexed for integration policy [${integrationPolicyId}]:\n${JSON.stringify(
      hostMetadataDoc,
      null,
      2
    )}`
  );

  await stopMetadataTransforms(esClient, integrationPolicy.package?.version ?? '');

  const hostDocId = uuidv4();
  // Rollback may only remove what this call created: an agent id that already has metadata keeps its
  // history. A failed read is inconclusive, so it is treated like existing metadata (the safe side).
  const existingMetadata = await esClient
    .count({
      index: METADATA_DATASTREAM,
      query: { term: { 'agent.id': hostMetadataDoc.agent.id } },
    })
    .catch(() => undefined);
  const hadMetadata = existingMetadata === undefined || existingMetadata.count > 0;

  try {
    // Create the Fleet agent
    const indexedFleetAgent = await indexFleetAgentForHost(
      esClient,
      hostMetadataDoc,
      agentPolicyId ?? integrationPolicy.policy_ids[0],
      kibanaVersion,
      undefined,
      agentPolicy.space_ids
    );

    mergeAndAppendArrays(response, indexedFleetAgent);

    logger.info(`New fleet agent indexed [${indexedFleetAgent.agents[0]?.agent?.id}]`);
    logger.verbose(JSON.stringify(indexedFleetAgent.agents, null, 2));

    await esClient
      .index({
        index: METADATA_DATASTREAM,
        id: hostDocId,
        body: hostMetadataDoc,
        op_type: 'create',
        refresh: 'wait_for',
      })
      .catch(catchHttpErrorFormatAndThrow);

    response.hosts.push(hostMetadataDoc);
    response.metadataIndex = METADATA_DATASTREAM;

    logger.info(
      `New endpoint host metadata doc indexed with agent id [${hostMetadataDoc.agent.id}]`
    );

    await startMetadataTransforms(
      esClient,
      [hostMetadataDoc.agent.id],
      integrationPolicy.package?.version ?? ''
    );

    return response;
  } catch (error) {
    // The Fleet agent and host metadata are indexed before the transforms start. A throw after that
    // point never returns `response`, so the caller has no cleanup handles: roll back what this call wrote.
    await rollbackIndexedHost(esClient, response, hostDocId, hadMetadata);
    throw error;
  }
};

/** Best effort: the Fleet agent is cleaned up even if the metadata cleanup fails; the caller rethrows the original error. */
const rollbackIndexedHost = async (
  esClient: Client,
  indexed: IndexedHostsResponse,
  hostDocId: string,
  hadMetadata: boolean
): Promise<void> => {
  const agentIds = indexed.hosts.map((host) => host.agent.id);

  const removeHostMetadata = async () => {
    // The source goes first and is refreshed: the transforms read it, so a destination cleanup that
    // ran alongside could be undone by a transform republishing the host afterwards.
    await esClient.deleteByQuery({
      index: METADATA_DATASTREAM,
      wait_for_completion: true,
      refresh: true,
      query: { ids: { values: [hostDocId] } },
    });

    if (hadMetadata) {
      return;
    }

    // The transforms may have copied the new host into their destinations before the failure. The
    // two destinations keep the agent id under different fields.
    await Promise.allSettled([
      esClient.deleteByQuery({
        index: metadataCurrentIndexPattern,
        ignore_unavailable: true,
        wait_for_completion: true,
        query: { terms: { 'agent.id': agentIds } },
      }),
      esClient.deleteByQuery({
        index: METADATA_UNITED_INDEX,
        ignore_unavailable: true,
        wait_for_completion: true,
        query: { terms: { 'united.endpoint.agent.id': agentIds } },
      }),
    ]);
  };

  await Promise.allSettled([
    indexed.hosts.length > 0 ? removeHostMetadata() : undefined,
    indexed.agents.length > 0 ? deleteIndexedFleetAgents(esClient, indexed) : undefined,
  ]);
};
