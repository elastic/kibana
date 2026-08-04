/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniq } from 'lodash';
import type {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';

import type { SearchResponse, SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import type { Agent, AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import { AgentNotFoundError } from '@kbn/fleet-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import {
  hasVersionSuffix,
  removeVersionSuffixFromPolicyId,
} from '@kbn/fleet-plugin/common/services/version_specific_policies_utils';
import { stringify } from '../../utils/stringify';
import type {
  HostInfo,
  HostMetadata,
  MaybeImmutable,
  MetadataListResponse,
  PolicyData,
  UnitedAgentMetadataPersistedData,
} from '../../../../common/endpoint/types';
import {
  EndpointHostNotFoundError,
  EndpointHostUnEnrolledError,
  FleetAgentNotFoundError,
  FleetAgentPolicyNotFoundError,
  FleetEndpointPackagePolicyNotFoundError,
} from './errors';
import {
  buildUnitedIndexQuery,
  getESQueryHostMetadataByFleetAgentIds,
  getESQueryHostMetadataByID,
  getESQueryHostMetadataByIDs,
} from '../../routes/metadata/query_builders';
import {
  mapToHostMetadata,
  queryResponseToHostListResult,
  queryResponseToHostResult,
} from '../../routes/metadata/support/query_strategies';
import {
  catchAndWrapError,
  DEFAULT_ENDPOINT_HOST_STATUS,
  fleetAgentStatusToEndpointHostStatus,
  wrapErrorIfNeeded,
} from '../../utils';
import { isFannedInHit } from '../../utils/cps_read_routing';
import { getAllEndpointPackagePolicies } from '../../routes/metadata/support/endpoint_package_policies';
import type { GetMetadataListRequestQuery } from '../../../../common/api/endpoint';
import { EndpointError } from '../../../../common/endpoint/errors';
import type { EndpointFleetServicesInterface } from '../fleet/endpoint_fleet_services_factory';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';

type AgentPolicyWithPackagePolicies = Omit<AgentPolicy, 'package_policies'> & {
  package_policies: PackagePolicy[];
};

const isAgentPolicyWithPackagePolicies = (
  agentPolicy: AgentPolicy | AgentPolicyWithPackagePolicies
): agentPolicy is AgentPolicyWithPackagePolicies => {
  return agentPolicy.package_policies ? true : false;
};

/**
 * Matches the offline threshold in Fleet's agent status runtime script, which is 12 missed check-in
 * intervals of 30 seconds (`MISSED_INTERVALS_BEFORE_OFFLINE * AGENT_POLLING_THRESHOLD_MS` in
 * `fleet/server/services/agents/build_status_runtime_field.ts`). Kept as a literal because Fleet does
 * not export either constant from its public entry point.
 */
const MS_BEFORE_OFFLINE = 12 * 30_000;

/**
 * Host status for a document whose `status` runtime field produced no value.
 *
 * That script reads doc values, and a hit fanned in from a linked project under CPS does not expose
 * them, so a healthy host would otherwise resolve to offline. `_source` survives fan-in intact, so
 * the status is derived from it using the same threshold the script applies.
 */
const statusFromSource = ({
  last_checkin: lastCheckin,
  last_checkin_status: lastCheckinStatus,
}: Pick<Agent, 'last_checkin' | 'last_checkin_status'>): Agent['status'] => {
  if (!lastCheckin) {
    return undefined;
  }

  if (Date.now() - new Date(lastCheckin).getTime() > MS_BEFORE_OFFLINE) {
    return 'offline';
  }

  return lastCheckinStatus?.toLowerCase() === 'degraded' ? 'degraded' : 'online';
};

export class EndpointMetadataService {
  private readonly esClient: ElasticsearchClient;
  private readonly soClient: SavedObjectsClientContract;
  private readonly fleetServices: EndpointFleetServicesInterface;
  private readonly logger: Logger;

  constructor(
    private readonly endpointContext: EndpointAppContextService,
    private readonly spaceId: string = DEFAULT_SPACE_ID
  ) {
    this.esClient = endpointContext.getInternalEsClient();
    this.soClient = endpointContext.savedObjects.createInternalScopedSoClient({
      readonly: false,
      spaceId,
    });
    this.fleetServices = endpointContext.getInternalFleetServices(spaceId);
    this.logger = endpointContext.createLogger('endpointMetadata');
  }

  /**
   * Validates that the data retrieved is valid for the current user space. We do this
   * by just querying fleet to ensure the policy is visible in the current space
   * (the space is determined from the `soClient`)
   *
   * @protected
   */
  protected async ensureDataValidForSpace(
    data: SearchResponse<HostMetadata>,
    cpsRead: boolean = false
  ): Promise<void> {
    const hits = data?.hits?.hits ?? [];
    const agentIds = hits.map((hit) => hit._source?.agent.id ?? '').filter((id) => !!id);

    if (agentIds.length === 0) {
      return;
    }

    this.logger.debug(
      `Checking to see if the following agent ids are valid for current space:\n${agentIds.join(
        '\n'
      )}`
    );

    try {
      await this.fleetServices.ensureInCurrentSpace({ agentIds });
    } catch (err) {
      // Fleet conflates two cases that must diverge under CPS: an agent enrolled here in another
      // space, which stays hidden, and one not enrolled here at all, which is a fanned-in document
      // and must render. Provenance separates them, and a locally unenrolled agent is
      // indistinguishable from a linked project's by lookup alone, so the document has to have come
      // from one. Any local hit in the set means the failure was real space isolation.
      if (!cpsRead || hits.some((hit) => !isFannedInHit(hit._index))) {
        throw err;
      }

      const locallyEnrolledAgents = await this.endpointContext
        .getInternalFleetServices(undefined, true)
        .fetchAgentsById(agentIds, { ignoreMissing: true })
        .catch(catchAndWrapError);

      if (locallyEnrolledAgents.length > 0) {
        this.logger.debug(
          () => `Agent ids [${agentIds.join(', ')}] are not visible in space [${this.spaceId}]`
        );

        throw err;
      }

      this.logger.debug(
        () =>
          `Agent ids [${agentIds.join(
            ', '
          )}] are not enrolled in this project; treating as a linked project's agents`
      );
    }
  }

  /**
   * Mutate the `hits` included in a search response against the United metadata index to address
   * known issue with data populated in the records
   * @param data
   * @private
   */
  private adjustUnitedIndexSearchResultHits(
    data: SearchResponse<UnitedAgentMetadataPersistedData>
  ): SearchResponse<UnitedAgentMetadataPersistedData> {
    const hits = data.hits?.hits ?? [];
    const recordsAltered: string[] = [];

    for (const hit of hits) {
      // If `united.agent.policy_id` includes a suffix, remove it
      if (
        hit._source?.united?.agent?.policy_id &&
        hasVersionSuffix(hit._source?.united?.agent?.policy_id)
      ) {
        const existingPolicyId = hit._source.united.agent.policy_id;
        const adjustedPolicyId = removeVersionSuffixFromPolicyId(existingPolicyId);

        recordsAltered.push(
          `Agent [${hit._source?.united?.agent?.agent?.id}]: adjusted 'policy_id' property value from [${existingPolicyId}] to [${adjustedPolicyId}]`
        );

        (hit._source.united.agent.policy_id as string) = adjustedPolicyId;
      }
    }

    if (recordsAltered.length > 0) {
      this.logger
        .get('adjustUnitedIndexSearchResultHits')
        .debug(
          () => `Made ${recordsAltered.length} data adjustments:\n${recordsAltered.join('\n')}`
        );
    }

    return data;
  }

  /**
   * Retrieve a single endpoint host metadata. Note that the return endpoint document, if found,
   * could be associated with a Fleet Agent that is no longer active. If wanting to ensure the
   * endpoint is associated with an active Fleet Agent, then use `getEnrichedHostMetadata()` instead
   *
   * @param endpointId the endpoint id (from `agent.id`)
   *
   * @throws
   */
  async getHostMetadata(endpointId: string, request?: KibanaRequest): Promise<HostMetadata> {
    const cpsRead = this.endpointContext.isCpsRead(request);
    const ccsEnabled = await this.endpointContext.isCcsEnabled();
    // A fanned-in hit's `_index` carries the project prefix and the space check below reads it, so a
    // CCS prefix on top of it would be ambiguous
    const query = getESQueryHostMetadataByID(endpointId, ccsEnabled && !cpsRead);
    const queryResult = await (cpsRead
      ? this.endpointContext.getReadEsClient(request)
      : this.esClient
    )
      .search<HostMetadata>(query)
      .catch(catchAndWrapError);

    await this.ensureDataValidForSpace(queryResult, cpsRead);

    const endpointMetadata = queryResponseToHostResult(queryResult).result;

    if (endpointMetadata) {
      return endpointMetadata;
    }

    throw new EndpointHostNotFoundError(`Endpoint with id ${endpointId} not found`);
  }

  /**
   * Find a  list of Endpoint Host Metadata document associated with a given list of Fleet Agent Ids
   * @param fleetAgentIds
   */
  async findHostMetadataForFleetAgents(fleetAgentIds: string[]): Promise<HostMetadata[]> {
    const ccsEnabled = await this.endpointContext.isCcsEnabled();
    const query = getESQueryHostMetadataByFleetAgentIds(fleetAgentIds, ccsEnabled);

    query.size = fleetAgentIds.length;

    const searchResult = await this.esClient
      .search<HostMetadata>(query, { ignore: [404] })
      .catch(catchAndWrapError);

    await this.ensureDataValidForSpace(searchResult);

    return queryResponseToHostListResult(searchResult).resultList;
  }

  /**
   * Retrieve a single endpoint host metadata along with fleet information
   *
   * @param endpointId the endpoint id (from `agent.id`)
   *
   * @throws
   */
  async getEnrichedHostMetadata(endpointId: string, request?: KibanaRequest): Promise<HostInfo> {
    const endpointMetadata = await this.getHostMetadata(endpointId, request);

    let fleetAgentId = endpointMetadata.elastic.agent.id;
    let fleetAgent: Agent | undefined;

    // Get Fleet agent
    try {
      if (!fleetAgentId) {
        fleetAgentId = endpointMetadata.agent.id;
        this.logger.warn(`Missing elastic agent id, using host id instead ${fleetAgentId}`);
      }

      fleetAgent = await this.getFleetAgent(fleetAgentId);
    } catch (error) {
      if (error instanceof FleetAgentNotFoundError) {
        this.logger.debug(`agent with id ${fleetAgentId} not found`);
      } else {
        throw error;
      }
    }

    // If the agent is no longer active, then that means that the Agent/Endpoint have been un-enrolled from the host
    if (fleetAgent && !fleetAgent.active) {
      throw new EndpointHostUnEnrolledError(
        `Endpoint with id ${endpointId} (Fleet agent id ${fleetAgentId}) is unenrolled`
      );
    }

    return this.enrichHostMetadata(endpointMetadata, fleetAgent);
  }

  /**
   * Enriches a host metadata document with data from fleet
   *
   * @param endpointMetadata
   * @param _fleetAgent
   * @param _fleetAgentPolicy
   * @param _endpointPackagePolicy
   * @internal
   */
  // eslint-disable-next-line complexity
  private async enrichHostMetadata(
    endpointMetadata: HostMetadata,
    /**
     * If undefined, it will be retrieved from Fleet using the ID in the endpointMetadata.
     * If passing in an `Agent` record that was retrieved from the Endpoint Unified transform index,
     * ensure that its `.status` property is properly set to the calculated value done by
     * fleet.
     */
    _fleetAgent?: MaybeImmutable<Agent>,
    /** If undefined, it will be retrieved from Fleet using data from the endpointMetadata  */
    _fleetAgentPolicy?:
      | MaybeImmutable<AgentPolicy>
      | MaybeImmutable<AgentPolicyWithPackagePolicies>,
    /** If undefined, it will be retrieved from Fleet using the ID in the endpointMetadata */
    _endpointPackagePolicy?: MaybeImmutable<PackagePolicy>
  ): Promise<HostInfo> {
    let fleetAgentId = endpointMetadata.elastic.agent.id;
    // casting below is done only to remove `immutable<>` from the object if they are defined as such
    let fleetAgent = _fleetAgent as Agent | undefined;
    let fleetAgentPolicy = _fleetAgentPolicy as
      | AgentPolicy
      | AgentPolicyWithPackagePolicies
      | undefined;
    let endpointPackagePolicy = _endpointPackagePolicy as PackagePolicy | undefined;

    if (!fleetAgent) {
      try {
        if (!fleetAgentId) {
          fleetAgentId = endpointMetadata.agent.id;
          this.logger.warn(
            new EndpointError(
              `Missing elastic fleet agent id on Endpoint Metadata doc - using Endpoint agent.id instead: ${fleetAgentId}`
            )
          );
        }

        fleetAgent = await this.getFleetAgent(fleetAgentId);
      } catch (error) {
        if (error instanceof FleetAgentNotFoundError) {
          this.logger.warn(`Agent with id ${fleetAgentId} not found`);
        } else {
          throw error;
        }
      }
    }

    if (!fleetAgentPolicy && fleetAgent) {
      try {
        fleetAgentPolicy = await this.getFleetAgentPolicy(fleetAgent.policy_id ?? '');
      } catch (error) {
        this.logger.error(error);
      }
    }

    // The fleetAgentPolicy might have the endpoint policy in the `package_policies`, let's check that first
    if (
      !endpointPackagePolicy &&
      fleetAgentPolicy &&
      isAgentPolicyWithPackagePolicies(fleetAgentPolicy)
    ) {
      endpointPackagePolicy = fleetAgentPolicy.package_policies.find(
        (policy) => policy.package?.name === 'endpoint'
      );
    }

    // if we still don't have an endpoint package policy, try retrieving it from `fleet`
    if (!endpointPackagePolicy) {
      try {
        endpointPackagePolicy = await this.getFleetEndpointPackagePolicy(
          endpointMetadata.Endpoint.policy.applied.id
        );
      } catch (error) {
        this.logger.error(error);
      }
    }
    return {
      metadata: endpointMetadata,
      host_status: fleetAgent
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          fleetAgentStatusToEndpointHostStatus(fleetAgent.status!)
        : DEFAULT_ENDPOINT_HOST_STATUS,
      policy_info: {
        agent: {
          applied: {
            revision: fleetAgent?.policy_revision ?? 0,
            id: fleetAgent?.policy_id ?? '',
          },
          configured: {
            revision: fleetAgentPolicy?.revision ?? 0,
            id: fleetAgentPolicy?.id ?? '',
          },
        },
        endpoint: {
          revision: endpointPackagePolicy?.revision ?? 0,
          id: endpointPackagePolicy?.id ?? '',
        },
      },
      last_checkin:
        fleetAgent?.last_checkin || new Date(endpointMetadata['@timestamp']).toISOString(),
    };
  }

  /**
   * Retrieve a single Fleet Agent data
   *
   * @param agentId The elastic agent id (`from `elastic.agent.id`)
   */
  async getFleetAgent(agentId: string): Promise<Agent> {
    try {
      return await this.fleetServices.fetchAgent(agentId);
    } catch (error) {
      if (error instanceof AgentNotFoundError) {
        throw new FleetAgentNotFoundError(`agent with id ${agentId} not found`, error);
      }

      throw new EndpointError(error.message, error);
    }
  }

  /**
   * Retrieve a specific Fleet Agent Policy
   *
   * @param agentPolicyId
   *
   * @throws
   */
  async getFleetAgentPolicy(agentPolicyId: string): Promise<AgentPolicyWithPackagePolicies> {
    const agentPolicy = await this.fleetServices.agentPolicy
      .get(this.soClient, agentPolicyId, true)
      .catch(catchAndWrapError);

    if (agentPolicy) {
      return agentPolicy as AgentPolicyWithPackagePolicies;
    }

    throw new FleetAgentPolicyNotFoundError(
      `Fleet agent policy with id ${agentPolicyId} not found`
    );
  }

  /**
   * Retrieve an endpoint policy from fleet
   * @param endpointPolicyId
   * @throws
   */
  async getFleetEndpointPackagePolicy(endpointPolicyId: string): Promise<PolicyData> {
    const endpointPackagePolicy = await this.fleetServices.packagePolicy
      .get(this.soClient, endpointPolicyId)
      .catch(catchAndWrapError);

    if (!endpointPackagePolicy) {
      throw new FleetEndpointPackagePolicyNotFoundError(
        `Fleet endpoint package policy with id ${endpointPolicyId} not found`
      );
    }

    return endpointPackagePolicy as PolicyData;
  }

  /**
   * Retrieve list of host metadata. Only supports new united index.
   *
   * @param queryOptions
   *
   * @throws
   */
  async getHostMetadataList(
    queryOptions: GetMetadataListRequestQuery,
    request?: KibanaRequest
  ): Promise<Pick<MetadataListResponse, 'data' | 'total'>> {
    const logger = this.logger.get('getHostMetadataList()');
    logger.debug(() => `Retrieving host metadata list using: ${stringify(queryOptions)}`);

    const cpsRead = this.endpointContext.isCpsRead(request);
    const ccsEnabled = await this.endpointContext.isCcsEnabled();
    const endpointPolicies = await this.getAllEndpointPackagePolicies();
    const endpointPolicyIds = uniq(endpointPolicies.flatMap((policy) => policy.policy_ids));
    const unitedIndexQuery = await buildUnitedIndexQuery(
      this.soClient,
      queryOptions,
      endpointPolicyIds,
      ccsEnabled,
      cpsRead ? this.spaceId : undefined
    );

    let unitedMetadataQueryResponse: SearchResponse<UnitedAgentMetadataPersistedData>;

    logger.debug(() => `Executing query: ${stringify(unitedIndexQuery, 15)}`);

    try {
      unitedMetadataQueryResponse = await (cpsRead
        ? this.endpointContext.getReadEsClient(request)
        : this.esClient
      )
        .search<UnitedAgentMetadataPersistedData>(unitedIndexQuery)
        .then(this.adjustUnitedIndexSearchResultHits.bind(this));

      // FYI: we don't need to run the ES search response through `this.ensureDataValidForSpace()` because
      // the query (`unitedIndexQuery`) above already included a filter with all of the valid policy ids
      // for the current space - thus data is already coped to the space. Under CPS that filter also
      // carries a `united.agent.namespaces` branch for documents from a linked project, whose agents
      // Fleet could not resolve here anyway.
    } catch (error) {
      const errorType = error?.meta?.body?.error?.type ?? '';
      if (errorType === 'index_not_found_exception') {
        return {
          data: [],
          total: 0,
        };
      }

      const err = wrapErrorIfNeeded(error);
      logger.error(err);
      throw err;
    }

    const { hits: docs, total: docsCount } = unitedMetadataQueryResponse?.hits || {};
    const agentPolicyIds: string[] = docs.map((doc) => doc._source?.united?.agent?.policy_id ?? '');

    // A linked project's agent references an agent policy that does not exist here, and Fleet throws
    // rather than skipping it, which would fail the whole list on the first fanned-in row. Only the
    // fanned-out read passes the option, so the origin-only call is left exactly as it was.
    const agentPolicies =
      (await (cpsRead
        ? this.fleetServices.agentPolicy.getByIds(this.soClient, agentPolicyIds, {
            ignoreMissing: true,
          })
        : this.fleetServices.agentPolicy.getByIds(this.soClient, agentPolicyIds)
      ).catch(catchAndWrapError)) ?? [];

    const agentPoliciesMap = agentPolicies.reduce<Record<string, AgentPolicy>>(
      (acc, agentPolicy) => {
        acc[agentPolicy.id] = {
          ...agentPolicy,
        };
        return acc;
      },
      {}
    );

    const endpointPoliciesMap = endpointPolicies.reduce<Record<string, PackagePolicy>>(
      (acc, packagePolicy) => {
        for (const policyId of packagePolicy.policy_ids) {
          acc[policyId] = packagePolicy;
        }
        return acc;
      },
      {}
    );

    const hosts: HostInfo[] = [];

    for (const doc of docs) {
      const { endpoint, agent: _agent } = doc?._source?.united ?? {};

      if (endpoint && _agent) {
        const metadata = mapToHostMetadata(endpoint);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const agentPolicy = agentPoliciesMap[_agent.policy_id!];
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const endpointPolicy = endpointPoliciesMap[_agent.policy_id!];
        const runtimeFields: Partial<typeof _agent> = {
          status: doc?.fields?.status?.[0] ?? statusFromSource(_agent),
          last_checkin: doc?.fields?.last_checkin?.[0] ?? _agent.last_checkin,
        };
        const agent: typeof _agent = {
          ..._agent,
          ...runtimeFields,
        };

        const hostInfo = await this.enrichHostMetadata(
          metadata,
          agent,
          agentPolicy,
          endpointPolicy
        );

        // TEMPORARY CPS DIAGNOSTIC. Lives on the flag-on image branch only, never merge to the PR.
        // Answers why a fanned-in row renders Offline while its Last active reads current.
        (hostInfo as unknown as Record<string, unknown>)._cpsDebug = {
          index: doc._index,
          fieldsStatus: doc.fields?.status ?? null,
          fieldsLastCheckin: doc.fields?.last_checkin ?? null,
          fieldsKeys: Object.keys(doc.fields ?? {}),
          resolvedStatus: agent.status ?? null,
          resolvedLastCheckin: agent.last_checkin ?? null,
          srcLastCheckin: _agent.last_checkin ?? null,
          srcLastCheckinStatus: _agent.last_checkin_status ?? null,
          srcActive: _agent.active ?? null,
          // Present on the document but absent from Fleet's `Agent` type
          srcPolicyRevisionIdx:
            (_agent as unknown as Record<string, unknown>).policy_revision_idx ?? null,
          srcEnrolledAt: _agent.enrolled_at ?? null,
          endpointTimestamp: endpoint['@timestamp'] ?? null,
          kibanaNow: new Date().toISOString(),
        };

        hosts.push(hostInfo);
      }
    }

    return {
      data: hosts,
      total: (docsCount as unknown as SearchTotalHits).value,
    };
  }

  async getAllEndpointPackagePolicies() {
    return getAllEndpointPackagePolicies(this.fleetServices.packagePolicy, this.soClient);
  }

  async getMetadataForEndpoints(endpointIDs: string[]): Promise<HostMetadata[]> {
    const ccsEnabled = await this.endpointContext.isCcsEnabled();
    const query = getESQueryHostMetadataByIDs(endpointIDs, ccsEnabled);

    this.logger.get('getMetadataForEndpoints').debug(() => `with query: ${stringify(query, 15)}`);

    const searchResult = await this.esClient.search<HostMetadata>(query).catch(catchAndWrapError);

    await this.ensureDataValidForSpace(searchResult);

    return queryResponseToHostListResult(searchResult).resultList;
  }
}
