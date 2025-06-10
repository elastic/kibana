/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable require-atomic-updates */

import { ENDPOINT_ARTIFACT_LISTS, ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { UpdateExceptionListItemOptions } from '@kbn/lists-plugin/server';
import pMap from 'p-map';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers, type Logger } from '@kbn/core/server';
import type {
  BulkRequest,
  SearchRequest,
  SearchTotalHits,
} from '@elastic/elasticsearch/lib/api/types';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { CROWDSTRIKE_HOST_INDEX_PATTERN } from '../../../common/endpoint/service/response_actions/crowdstrike';
import { SENTINEL_ONE_AGENT_INDEX_PATTERN } from '../../../common/endpoint/service/response_actions/sentinel_one';
import { MICROSOFT_DEFENDER_ENDPOINT_LOG_INDEX_PATTERN } from '../../../common/endpoint/service/response_actions/microsoft_defender';
import type { ResponseActionAgentType } from '../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES } from '../../../common/endpoint/service/response_actions/constants';
import { EndpointError } from '../../../common/endpoint/errors';
import type {
  LogsEndpointAction,
  MicrosoftDefenderEndpointLogEsDoc,
} from '../../../common/endpoint/types';
import { createEsSearchIterable } from '../utils/create_es_search_iterable';
import { stringify } from '../utils/stringify';
import { REFERENCE_DATA_SAVED_OBJECT_TYPE } from '../lib/reference_data';
import {
  buildSpaceOwnerIdTag,
  hasArtifactOwnerSpaceId,
} from '../../../common/endpoint/service/artifacts/utils';
import { catchAndWrapError, wrapErrorIfNeeded } from '../utils';
import { QueueProcessor } from '../utils/queue_processor';
import type { EndpointAppContextService } from '../endpoint_app_context_services';
import type { ReferenceDataSavedObject } from '../lib/reference_data/types';
import { ENDPOINT_ACTIONS_INDEX } from '../../../common/endpoint/constants';

const LOGGER_KEY = 'migrateEndpointDataToSupportSpaces';
const ARTIFACTS_MIGRATION_REF_DATA_ID = 'SPACE-AWARENESS-ARTIFACT-MIGRATION' as const;
const RESPONSE_ACTIONS_MIGRATION_REF_DATA_ID =
  'SPACE-AWARENESS-RESPONSE-ACTIONS-MIGRATION' as const;
const NOT_FOUND_VALUE = 'MIGRATION:NOT-FOUND';

export type MigrationStateReferenceData = ReferenceDataSavedObject<{
  started: string;
  finished: string;
  status: 'not-started' | 'complete' | 'pending';
  data?: unknown;
}>;

type PolicyPartialUpdate = Pick<LogsEndpointAction, 'originSpaceId'> & {
  agent: Pick<LogsEndpointAction['agent'], 'policy'>;
};

export const migrateEndpointDataToSupportSpaces = async (
  endpointService: EndpointAppContextService
): Promise<void> => {
  const logger = endpointService.createLogger(LOGGER_KEY);

  if (!endpointService.experimentalFeatures.endpointManagementSpaceAwarenessEnabled) {
    logger.debug('Space awareness feature flag is disabled. Nothing to do.');
    return;
  }

  await Promise.all([
    migrateArtifactsToSpaceAware(endpointService),
    migrateResponseActionsToSpaceAware(endpointService),
  ]);
};

// TODO:PT move this to a new data access client
const getMigrationState = async (
  soClient: SavedObjectsClientContract,
  logger: Logger,
  id: typeof ARTIFACTS_MIGRATION_REF_DATA_ID | typeof RESPONSE_ACTIONS_MIGRATION_REF_DATA_ID
): Promise<MigrationStateReferenceData> => {
  return soClient
    .get<MigrationStateReferenceData>(REFERENCE_DATA_SAVED_OBJECT_TYPE, id)
    .then((response) => {
      logger.debug(`Retrieved migration state for [${id}]\n${stringify(response)}`);
      return response.attributes;
    })
    .catch(async (err) => {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        logger.debug(`Creating migration state for [${id}]`);

        const createResponse = await soClient
          .create<MigrationStateReferenceData>(
            REFERENCE_DATA_SAVED_OBJECT_TYPE,
            {
              id,
              type: 'MIGRATION',
              owner: 'EDR',
              metadata: {
                started: '',
                finished: '',
                status: 'not-started',
              },
            },
            { id }
          )
          .catch(catchAndWrapError);

        return createResponse.attributes;
      }

      throw wrapErrorIfNeeded(err, `Failed to retrieve migration state for [${id}]`);
    });
};

// TODO:PT move this to a new data access client
const updateMigrationState = async (
  soClient: SavedObjectsClientContract,
  id: typeof ARTIFACTS_MIGRATION_REF_DATA_ID | typeof RESPONSE_ACTIONS_MIGRATION_REF_DATA_ID,
  update: MigrationStateReferenceData
): Promise<MigrationStateReferenceData> => {
  await soClient
    .update<MigrationStateReferenceData>(REFERENCE_DATA_SAVED_OBJECT_TYPE, id, update, {
      refresh: 'wait_for',
    })
    .catch(catchAndWrapError);

  return update;
};

const migrateArtifactsToSpaceAware = async (
  endpointService: EndpointAppContextService
): Promise<void> => {
  const logger = endpointService.createLogger(LOGGER_KEY, 'artifacts');
  const soClient = endpointService.savedObjects.createInternalScopedSoClient({ readonly: false });
  const migrationState = await getMigrationState(soClient, logger, ARTIFACTS_MIGRATION_REF_DATA_ID);

  if (migrationState.metadata.status !== 'not-started') {
    logger.debug(
      `Migration for endpoint artifacts in support of spaces has a status of [${migrationState.metadata.status}]. Nothing to do.`
    );
    return;
  }

  logger.info(`starting migration of endpoint artifacts in support of spaces`);

  migrationState.metadata.status = 'pending';
  migrationState.metadata.started = new Date().toISOString();
  await updateMigrationState(soClient, ARTIFACTS_MIGRATION_REF_DATA_ID, migrationState);

  const exceptionsClient = endpointService.getExceptionListsClient();
  const listIds: string[] = Object.values(ENDPOINT_ARTIFACT_LISTS).map(({ id }) => id);
  listIds.push(ENDPOINT_LIST_ID);

  logger.debug(`artifact list ids to process: ${listIds.join(', ')}`);

  const migrationStats = {
    totalItems: 0,
    itemsNeedingUpdates: 0,
    successUpdates: 0,
    failedUpdates: 0,
    artifacts: listIds.reduce((acc, listId) => {
      acc[listId] = {
        success: 0,
        failed: 0,
        errors: [],
      };

      return acc;
    }, {} as Record<string, { success: number; failed: number; errors: string[] }>),
  };

  migrationState.metadata.data = migrationStats;

  const updateProcessor = new QueueProcessor<UpdateExceptionListItemOptions & { listId: string }>({
    batchSize: 50,
    batchHandler: async ({ data: artifactUpdates }) => {
      // TODO:PT add a `bulkUpdate()` to the exceptionsListClient

      migrationStats.itemsNeedingUpdates += artifactUpdates.length;

      await pMap(
        artifactUpdates,
        async ({ listId, ...artifactUpdate }) => {
          try {
            const updatedArtifact = await exceptionsClient.updateExceptionListItem(artifactUpdate);

            if (updatedArtifact) {
              migrationStats.successUpdates++;
              migrationStats.artifacts[listId].success++;
            }
          } catch (err) {
            migrationStats.failedUpdates++;
            migrationStats.artifacts[listId].failed++;
            migrationStats.artifacts[listId].errors.push(
              `Update to [${listId}] item ID [${artifactUpdate.itemId}] failed with: ${err.message}`
            );
          }
        },
        { stopOnError: false, concurrency: 10 }
      );

      await updateMigrationState(soClient, ARTIFACTS_MIGRATION_REF_DATA_ID, migrationState);
    },
  });

  await exceptionsClient
    .findExceptionListsItemPointInTimeFinder({
      listId: listIds,
      namespaceType: listIds.map(() => 'agnostic'),
      filter: listIds.map(
        () => `NOT exception-list-agnostic.attributes.tags:"${buildSpaceOwnerIdTag('*')}"`
      ),
      perPage: undefined,
      sortField: undefined,
      sortOrder: undefined,
      maxSize: undefined,
      executeFunctionOnStream: ({ page, total, data }) => {
        logger.debug(
          `Checking page [${page}] with [${data.length}] items out of a total of [${total}] artifact entries need updates`
        );

        if (migrationStats.totalItems < total) {
          migrationStats.totalItems = total;
        }

        for (const artifact of data) {
          if (!hasArtifactOwnerSpaceId(artifact)) {
            updateProcessor.addToQueue({
              _version: undefined,
              comments: artifact.comments,
              description: artifact.description,
              entries: artifact.entries,
              expireTime: artifact.expire_time,
              id: artifact.id,
              itemId: artifact.item_id,
              listId: artifact.list_id,
              meta: artifact.meta,
              name: artifact.name,
              namespaceType: artifact.namespace_type,
              osTypes: artifact.os_types,
              type: artifact.type,
              tags: [...(artifact.tags ?? []), buildSpaceOwnerIdTag(DEFAULT_SPACE_ID)],
            });
          }
        }
      },
    })
    .catch(catchAndWrapError);

  await updateProcessor.complete();

  migrationState.metadata.status = 'complete';
  migrationState.metadata.finished = new Date().toISOString();
  await updateMigrationState(soClient, ARTIFACTS_MIGRATION_REF_DATA_ID, migrationState);

  logger.info(
    `migration of endpoint artifacts in support of spaces done.\n${JSON.stringify(
      migrationStats,
      null,
      2
    )}`
  );
};

const migrateResponseActionsToSpaceAware = async (
  endpointService: EndpointAppContextService
): Promise<void> => {
  // FIXME:PT how do we ensure that the new endpoint package is installed first - since we need the index mappings to be applied

  const logger = endpointService.createLogger(LOGGER_KEY, 'responseActions');
  const soClient = endpointService.savedObjects.createInternalScopedSoClient({ readonly: false });
  const migrationState = await getMigrationState(
    soClient,
    logger,
    RESPONSE_ACTIONS_MIGRATION_REF_DATA_ID
  );

  if (migrationState.metadata.status !== 'not-started') {
    logger.debug(
      `Migration for endpoint response actions in support of spaces has a status of [${migrationState.metadata.status}]. Nothing to do.`
    );
    return;
  }

  logger.info(`starting migration of endpoint response actions in support of spaces`);

  const migrationStats = {
    totalItems: 0,
    itemsNeedingUpdates: 0,
    successUpdates: 0,
    failedUpdates: 0,
    warnings: [] as string[],
    errors: [] as string[],
  };

  migrationState.metadata.status = 'pending';
  migrationState.metadata.started = new Date().toISOString();
  migrationState.metadata.data = migrationStats;
  await updateMigrationState(soClient, RESPONSE_ACTIONS_MIGRATION_REF_DATA_ID, migrationState);

  // FIXME:PT need to ensure that 9.1 package is installed OR that the index has  mappings

  const policyInfoBuilder = new AgentPolicyInfoBuilder(endpointService, logger);
  const esClient = endpointService.getInternalEsClient();
  const updateProcessor = new QueueProcessor<{
    index: string;
    docId: string;
    actionId: string;
    update: PolicyPartialUpdate;
  }>({
    batchSize: 50,
    logger,
    batchHandler: async ({ data: actionUpdates }) => {
      migrationStats.itemsNeedingUpdates += actionUpdates.length;
      const docIdToResponseActionIdMap: Record<string, string> = {};
      const bulkOperations: Required<BulkRequest>['operations'] = [];

      for (const actionUpdateInfo of actionUpdates) {
        docIdToResponseActionIdMap[actionUpdateInfo.docId] = actionUpdateInfo.actionId;

        bulkOperations.push(
          { update: { _index: actionUpdateInfo.index, _id: actionUpdateInfo.docId } },
          { doc: actionUpdateInfo.update }
        );
      }

      logger.debug(`Calling esClient.bulk() with [${actionUpdates.length}] updates`);

      try {
        const bulkUpdateResponse = await esClient.bulk({ operations: bulkOperations });

        if (!bulkUpdateResponse.errors) {
          migrationStats.successUpdates += actionUpdates.length;
        } else {
          for (const operationResult of bulkUpdateResponse.items) {
            const updateResponse = operationResult.update;

            if (updateResponse?.error) {
              migrationStats.failedUpdates++;
              migrationStats.errors.push(
                `Update to response action [${
                  docIdToResponseActionIdMap[updateResponse._id ?? '']
                }] _id [${updateResponse._id}] failed: ${updateResponse.error.reason}`
              );
            } else {
              migrationStats.successUpdates++;
            }
          }
        }
      } catch (err) {
        logger.error(`ES Bulk update failed with: ${stringify(err)}`);

        migrationStats.failedUpdates += actionUpdates.length;

        migrationStats.errors.push(
          `Bulk update of action ids [${Object.values(docIdToResponseActionIdMap).join(
            ', '
          )}] failed with: ${err.message}`
        );
      }

      // Write stats so we can see intermediate stats if required
      await updateMigrationState(soClient, RESPONSE_ACTIONS_MIGRATION_REF_DATA_ID, migrationState);
    },
  });

  const responseActionsFetcher = createEsSearchIterable<LogsEndpointAction>({
    esClient,
    searchRequest: {
      index: ENDPOINT_ACTIONS_INDEX,
      sort: '@timestamp',
      size: 50,
      query: {
        bool: { must_not: { exists: { field: 'originSpaceId' } } },
      },
    },
  });

  const updateBuilderPromises: Array<Promise<unknown>> = [];

  for await (const actionRequestSearchResults of responseActionsFetcher) {
    const actionRequests = actionRequestSearchResults.hits.hits;
    const totalItems = (actionRequestSearchResults.hits.total as SearchTotalHits).value ?? 0;

    if (migrationStats.totalItems !== totalItems) {
      migrationStats.totalItems = totalItems;
    }

    for (const actionHit of actionRequests) {
      const action = actionHit._source;

      if (action) {
        updateBuilderPromises.push(
          // We don't `await` here. These can just run in the background so that migration runs a little faster
          policyInfoBuilder.buildPolicyUpdate(action).then((updateContent) => {
            if (updateContent.warnings.length > 0) {
              migrationStats.warnings.push(...updateContent.warnings);
            }

            updateProcessor.addToQueue({
              actionId: action.EndpointActions.action_id,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              docId: actionHit._id!,
              index: actionHit._index,
              update: updateContent.policyUpdate,
            });
          })
        );
      }
    }
  }

  await Promise.allSettled(updateBuilderPromises);
  await updateProcessor.complete();

  migrationState.metadata.status = 'complete';
  migrationState.metadata.finished = new Date().toISOString();
  await updateMigrationState(soClient, RESPONSE_ACTIONS_MIGRATION_REF_DATA_ID, migrationState);

  logger.info(
    `migration of endpoint response actions in support of spaces done.\n${JSON.stringify(
      migrationStats,
      null,
      2
    )}`
  );
};

interface AgentPolicyInfo {
  warnings: string[];
  agentInfo: LogsEndpointAction['agent']['policy'][number];
}

interface ActionPolicyInfo {
  warnings: string[];
  policyUpdate: PolicyPartialUpdate;
}

interface PolicyIdInfo {
  found: boolean;
  warning: string;
  policyId: string;
}

interface AgentIdInfo {
  found: boolean;
  warning: string;
  agentId: string;
}

class AgentPolicyInfoBuilder {
  // Cache of previously processed Agent IDs
  private agentIdCache = new Map<string, Promise<AgentPolicyInfo>>();
  private agentIdToAgentPolicyIdCache = new Map<string, Promise<PolicyIdInfo>>();
  private agentPolicyIdToIntegrationPolicyId = new Map<string, Promise<PolicyIdInfo>>();
  private externalEdrAgentIdToElasticAgentIdMapCache = new Map<string, Promise<AgentIdInfo>>();

  constructor(
    private readonly endpointService: EndpointAppContextService,
    private readonly logger: Logger
  ) {}

  public async buildPolicyUpdate(actionRequest: LogsEndpointAction): Promise<ActionPolicyInfo> {
    // TODO: trigger retrieval of agent records and package polices for those agents in bulk??

    const agentsPolicyInfo = (
      Array.isArray(actionRequest.agent.id) ? actionRequest.agent.id : [actionRequest.agent.id]
    ).map((agentId) => {
      let agentPolicyInfoPromise = this.agentIdCache.get(agentId);

      if (!agentPolicyInfoPromise) {
        this.logger.debug(
          `Agent ID [${agentId}] policy info content not yet created. Building it now`
        );

        agentPolicyInfoPromise = this.fetchAgentPolicyInfo(agentId, actionRequest);
        this.agentIdCache.set(agentId, agentPolicyInfoPromise);
        return agentPolicyInfoPromise;
      } else {
        this.logger.debug(
          `Found cached policy info for agent ID [${agentId}]. No need to build it.`
        );
      }

      return agentPolicyInfoPromise;
    });

    const response: ActionPolicyInfo = {
      warnings: [],
      policyUpdate: {
        originSpaceId: DEFAULT_SPACE_ID,
        agent: { policy: [] },
      },
    };

    await Promise.all(agentsPolicyInfo).then((agentsInfo) => {
      for (const agentPolicyInfo of agentsInfo) {
        if (agentPolicyInfo.warnings.length > 0) {
          response.warnings.push(...agentPolicyInfo.warnings);
        }

        response.policyUpdate.agent.policy.push(agentPolicyInfo.agentInfo);
      }
    });

    this.logger.debug(
      () =>
        `Action [${actionRequest.EndpointActions.action_id}] update: ${JSON.stringify(response)}`
    );

    return response;
  }

  private async fetchAgentPolicyInfo(
    _agentId: string,
    actionRequest: LogsEndpointAction
  ): Promise<AgentPolicyInfo> {
    let agentId = _agentId;

    if (actionRequest.EndpointActions.input_type !== 'endpoint') {
      const externalEdrAgentId = await this.fetchElasticAgentIdFor3rdPartyEdr(
        _agentId,
        actionRequest
      );

      if (!externalEdrAgentId.found) {
        return {
          warnings: [externalEdrAgentId.warning],
          agentInfo: {
            agentId: _agentId,
            elasticAgentId: NOT_FOUND_VALUE,
            agentPolicyId: NOT_FOUND_VALUE,
            integrationPolicyId: NOT_FOUND_VALUE,
          },
        };
      }

      agentId = externalEdrAgentId.agentId;
    }

    const agentPolicyId = await this.fetchAgentPolicyIdForAgent(agentId);

    // If the agent policy is not found, then no need to go any further because we will not be able
    // to determine what integration policy the agent was/is running with.
    if (!agentPolicyId.found) {
      return {
        warnings: [agentPolicyId.warning],
        agentInfo: {
          agentId: _agentId,
          elasticAgentId: agentId,
          agentPolicyId: NOT_FOUND_VALUE,
          integrationPolicyId: NOT_FOUND_VALUE,
        },
      };
    }

    const integrationPolicyId = await this.fetchAgentPolicyIntegrationPolicyId(
      agentPolicyId.policyId,
      actionRequest.EndpointActions.input_type
    );

    return {
      warnings: integrationPolicyId.found ? [] : [integrationPolicyId.warning],
      agentInfo: {
        agentId: _agentId,
        elasticAgentId: agentId,
        agentPolicyId: agentPolicyId.policyId,
        integrationPolicyId: integrationPolicyId.policyId,
      },
    };
  }

  private async fetchAgentPolicyIdForAgent(agentId: string): Promise<PolicyIdInfo> {
    let agentPolicyIdPromise = this.agentIdToAgentPolicyIdCache.get(agentId);

    if (!agentPolicyIdPromise) {
      const fleetServices = this.endpointService.getInternalFleetServices(undefined, true);

      agentPolicyIdPromise = fleetServices.agent
        .getAgent(agentId)
        .then((agent) => {
          if (!agent.policy_id) {
            throw new EndpointError(
              `Agent id [${agentId}] was found, but it does not contain a 'policy_id'`
            );
          }

          return { found: true, warning: '', policyId: agent.policy_id };
        })
        .catch((err) => {
          return {
            found: false,
            warning: `Unable to retrieve agent id [${agentId}]: ${err.message}`,
            policyId: NOT_FOUND_VALUE,
          };
        });

      this.agentIdToAgentPolicyIdCache.set(agentId, agentPolicyIdPromise);

      return agentPolicyIdPromise;
    }

    return agentPolicyIdPromise;
  }

  private async fetchAgentPolicyIntegrationPolicyId(
    agentPolicyId: string,
    agentType: ResponseActionAgentType
  ): Promise<PolicyIdInfo> {
    // An agent policy - especially one for agentless integration (3rd party EDRs) - could include
    // multiple integration for the supported agent types, so we keep a cache for each agent type
    const cacheKey = `${agentPolicyId}#${agentType}`;
    let integrationPolicyIdPromise = this.agentPolicyIdToIntegrationPolicyId.get(cacheKey);

    if (!integrationPolicyIdPromise) {
      const fleetServices = this.endpointService.getInternalFleetServices(undefined, true);

      integrationPolicyIdPromise = fleetServices.packagePolicy
        .list(fleetServices.getSoClient(), {
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: (${RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES[
            agentType
          ].join(' OR ')}) AND (${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.policy_ids:"${agentPolicyId}")`,
          perPage: 1,
        })
        .then((response) => {
          const integrationPolicy = response.items[0];

          if (!integrationPolicy) {
            throw new EndpointError(
              `Unable to find [${agentType}] integration policies for agent policy id [${agentPolicyId}]`
            );
          }

          return {
            found: true,
            warning: '',
            policyId: integrationPolicy.id,
          };
        })
        .catch((err) => {
          return {
            found: false,
            warning:
              err instanceof EndpointError
                ? err.message
                : `Failed to find [${agentType}] integration polices for agent policy [${agentPolicyId}]: ${err.message}`,
            policyId: NOT_FOUND_VALUE,
          };
        });

      this.agentPolicyIdToIntegrationPolicyId.set(cacheKey, integrationPolicyIdPromise);
    }

    return integrationPolicyIdPromise;
  }

  async fetchElasticAgentIdFor3rdPartyEdr(
    externalEdrAgentId: string,
    actionRequest: LogsEndpointAction
  ): Promise<AgentIdInfo> {
    const agentType = actionRequest.EndpointActions.input_type;
    const elasticAgentIdPromise =
      this.externalEdrAgentIdToElasticAgentIdMapCache.get(externalEdrAgentId);

    if (elasticAgentIdPromise) {
      this.logger.debug(`Returning cached result [${agentType}] agent id [${externalEdrAgentId}]`);
      return elasticAgentIdPromise;
    }

    this.externalEdrAgentIdToElasticAgentIdMapCache.set(
      externalEdrAgentId,
      new Promise(async (resolve, reject) => {
        try {
          const esClient = this.endpointService.getInternalEsClient();

          this.logger.debug(
            `Retrieving Elastic agent id for [${agentType}] agent [${externalEdrAgentId}]`
          );

          const esSearchRequest: SearchRequest = {
            index: '', // value by switch statement below
            // query: {} set by switch statement below
            _source: ['agent'],
            sort: [{ 'event.created': 'desc' }],
            ignore_unavailable: true,
            allow_no_indices: true,
            size: 1,
          };

          switch (agentType) {
            case 'microsoft_defender_endpoint':
              esSearchRequest.index = MICROSOFT_DEFENDER_ENDPOINT_LOG_INDEX_PATTERN;
              esSearchRequest.query = {
                bool: { filter: [{ term: { 'cloud.instance.id': externalEdrAgentId } }] },
              };
              break;

            case 'sentinel_one':
              esSearchRequest.index = SENTINEL_ONE_AGENT_INDEX_PATTERN;
              esSearchRequest.query = {
                bool: { filter: [{ term: { 'sentinel_one.agent.agent.id': externalEdrAgentId } }] },
              };
              break;

            case 'crowdstrike':
              esSearchRequest.index = CROWDSTRIKE_HOST_INDEX_PATTERN;
              esSearchRequest.query = {
                bool: { filter: [{ term: { 'device.id': externalEdrAgentId } }] },
              };
              break;

            default:
              resolve({
                found: false,
                warning: `Response action [${actionRequest.EndpointActions.action_id}] has an unsupported agent type [${agentType}].]`,
                agentId: '',
              });
              return;
          }

          this.logger.debug(
            () =>
              `Searching [${agentType}] data to identify elastic agent used to ingest data for external agent id [${externalEdrAgentId}]:${stringify(
                esSearchRequest
              )}`
          );

          const esSearchResult = await esClient
            .search<MicrosoftDefenderEndpointLogEsDoc>(esSearchRequest)
            .catch(catchAndWrapError);
          const hitSource = esSearchResult.hits.hits[0]?._source;

          if (hitSource && hitSource.agent.id) {
            resolve({
              found: true,
              warning: '',
              agentId: hitSource.agent.id,
            });
            return;
          }

          resolve({
            found: false,
            warning: `Unable to determine elastic agent id used to ingest data for [${agentType}] external agent id [${externalEdrAgentId}]`,
            agentId: '',
          });
        } catch (error) {
          reject(error);
        }
      })
    );

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.externalEdrAgentIdToElasticAgentIdMapCache.get(externalEdrAgentId)!;
  }
}
