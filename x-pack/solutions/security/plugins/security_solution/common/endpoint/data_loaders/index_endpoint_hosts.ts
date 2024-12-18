/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { cloneDeep } from 'lodash';
import type { AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import type { KbnClient } from '@kbn/test';
import type { DeleteByQueryResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { CreatePackagePolicyResponse, GetInfoResponse } from '@kbn/fleet-plugin/common';
import type { BulkRequest } from '@elastic/elasticsearch/lib/api/types';
import { EndpointError } from '../errors';
import { usageTracker } from './usage_tracker';
import { EndpointDocGenerator } from '../generate_data';
import type { HostMetadata, HostPolicyResponse } from '../types';
import type {
  BuildFleetAgentBulkCreateOperationsResponse,
  DeleteIndexedFleetAgentsResponse,
  IndexedFleetAgentResponse,
} from './index_fleet_agent';
import { buildFleetAgentBulkCreateOperations, deleteIndexedFleetAgents } from './index_fleet_agent';
import type {
  DeleteIndexedEndpointFleetActionsResponse,
  IndexedEndpointAndFleetActionsForHostResponse,
} from './index_endpoint_fleet_actions';
import {
  buildIEndpointAndFleetActionsBulkOperations,
  deleteIndexedEndpointAndFleetActions,
  type IndexEndpointAndFleetActionsForHostOptions,
} from './index_endpoint_fleet_actions';

import type {
  DeleteIndexedFleetEndpointPoliciesResponse,
  IndexedFleetEndpointPolicyResponse,
} from './index_fleet_endpoint_policy';
import {
  deleteIndexedFleetEndpointPolicies,
  indexFleetEndpointPolicy,
} from './index_fleet_endpoint_policy';
import { metadataCurrentIndexPattern } from '../constants';
import {
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
  }): Promise<IndexedHostsResponse> => {
    const timeBetweenDocs = 6 * 3600 * 1000; // 6 hours between metadata documents
    const timestamp = new Date().getTime();
    const kibanaVersion = await fetchKibanaVersion(kbnClient);
    const activeSpaceId = await fetchActiveSpaceId(kbnClient);
    const response: IndexedHostsResponse = {
      hosts: [],
      agents: [],
      policyResponses: [],
      metadataIndex,
      policyResponseIndex,
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
    let hostMetadata: HostMetadata;
    let wasAgentEnrolled = false;

    const bulkOperations: BulkRequest['operations'] = [];

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

          // eslint-disable-next-line require-atomic-updates
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

          const { operations, ...indexFleetActions } = buildIEndpointAndFleetActionsBulkOperations({
            endpoints: [hostMetadata],
            count,
            alertIds,
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

    return response;
  }
);

const fetchKibanaVersion = async (kbnClient: KbnClient) => {
  const version = (
    (await kbnClient.request({
      path: '/api/status',
      method: 'GET',
    })) as AxiosResponse
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
  indexedData: IndexedHostsResponse
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

  if (indexedData.hosts.length) {
    const query = {
      bool: {
        filter: [{ terms: { 'agent.id': indexedData.hosts.map((host) => host.agent.id) } }],
      },
    };

    response.hosts = await esClient
      .deleteByQuery({
        index: indexedData.metadataIndex,
        wait_for_completion: true,
        query,
      })
      .catch(wrapErrorAndRejectPromise);

    // Delete from the transform destination index
    await esClient
      .deleteByQuery({
        index: metadataCurrentIndexPattern,
        wait_for_completion: true,
        query,
      })
      .catch(wrapErrorAndRejectPromise);
  }

  if (indexedData.policyResponses.length) {
    response.policyResponses = await esClient
      .deleteByQuery({
        index: indexedData.policyResponseIndex,
        wait_for_completion: true,
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
  mergeAndAppendArrays(response, await deleteIndexedEndpointAndFleetActions(esClient, indexedData));
  mergeAndAppendArrays(response, await deleteIndexedFleetEndpointPolicies(kbnClient, indexedData));

  return response;
};
