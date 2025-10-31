/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type {
  AttackDiscoveryFindResponse,
  AttackDiscoveryApiAlert,
  CreateAttackDiscoveryAlertsParams,
  FindAttackDiscoveryAlertsParams,
  GetAttackDiscoveryGenerationsResponse,
  PostAttackDiscoveryGenerationsDismissResponse,
} from '@kbn/elastic-assistant-common';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';

import { buildEsQuery, type EsQueryConfig } from '@kbn/es-query';
import type { AIAssistantDataClientParams } from '../../../ai_assistant_data_clients';
import { AIAssistantDataClient } from '../../../ai_assistant_data_clients';
import { findDocuments, getQueryFilter } from '../../../ai_assistant_data_clients/find';
import { combineFindAttackDiscoveryFilters } from './combine_find_attack_discovery_filters';
import { createAttackDiscoveryAlerts } from './create_attack_discovery_alerts';
import { getAttackDiscoveryGenerations } from './get_attack_discovery_generations';
import { getAttackDiscoveryGenerationByIdQuery } from './get_attack_discovery_generation_by_id_query';
import { getAttackDiscoveryGenerationsQuery } from './get_attack_discovery_generations_query';
import { getCombinedFilter } from './get_combined_filter';
import { getFindAttackDiscoveryAlertsAggregation } from './get_find_attack_discovery_alerts_aggregation';
import type { AttackDiscoveryAlertDocument } from '../schedules/types';
import { transformSearchResponseToAlerts } from './transforms/transform_search_response_to_alerts';
import { getScheduledIndexPattern } from './get_scheduled_index_pattern';
import { getUpdateAttackDiscoveryAlertsQuery } from '../get_update_attack_discovery_alerts_query';

const FIRST_PAGE = 1; // CAUTION: sever-side API uses a 1-based page index convention (for consistency with similar existing APIs)
const DEFAULT_PER_PAGE = 10;

type AttackDiscoveryDataClientParams = AIAssistantDataClientParams & {
  adhocAttackDiscoveryDataClient: IRuleDataClient | undefined;
};

export class AttackDiscoveryDataClient extends AIAssistantDataClient {
  private adhocAttackDiscoveryDataClient: IRuleDataClient | undefined;

  constructor(public readonly options: AttackDiscoveryDataClientParams) {
    super(options);

    this.adhocAttackDiscoveryDataClient = this.options.adhocAttackDiscoveryDataClient;
  }

  public getAdHocAlertsIndexPattern = () => {
    if (this.adhocAttackDiscoveryDataClient === undefined) {
      throw new Error('`adhocAttackDiscoveryDataClient` is required');
    }
    return this.adhocAttackDiscoveryDataClient.indexNameWithNamespace(this.spaceId);
  };

  public getScheduledAndAdHocIndexPattern = () => {
    return [
      getScheduledIndexPattern(this.spaceId), // scheduled
      this.getAdHocAlertsIndexPattern(), // ad-hoc
    ].join(',');
  };

  public createAttackDiscoveryAlerts = async ({
    authenticatedUser,
    createAttackDiscoveryAlertsParams,
  }: {
    authenticatedUser: AuthenticatedUser;
    createAttackDiscoveryAlertsParams: CreateAttackDiscoveryAlertsParams;
  }): Promise<AttackDiscoveryApiAlert[]> => {
    if (this.adhocAttackDiscoveryDataClient === undefined) {
      throw new Error('`adhocAttackDiscoveryDataClient` is required');
    }
    return createAttackDiscoveryAlerts({
      adhocAttackDiscoveryDataClient: this.adhocAttackDiscoveryDataClient,
      authenticatedUser,
      createAttackDiscoveryAlertsParams,
      logger: this.options.logger,
      spaceId: this.spaceId,
    });
  };

  public findAttackDiscoveryAlerts = async ({
    authenticatedUser,
    esClient,
    findAttackDiscoveryAlertsParams,
    logger,
  }: {
    authenticatedUser: AuthenticatedUser;
    esClient: ElasticsearchClient;
    findAttackDiscoveryAlertsParams: FindAttackDiscoveryAlertsParams;
    logger: Logger;
  }): Promise<AttackDiscoveryFindResponse> => {
    const {
      alertIds,
      connectorNames, // <-- as a filter input
      enableFieldRendering,
      end,
      executionUuid,
      includeUniqueAlertIds,
      ids,
      search,
      shared,
      sortField = '@timestamp',
      sortOrder = 'desc',
      start,
      status,
      page = FIRST_PAGE,
      perPage = DEFAULT_PER_PAGE,
      withReplacements = false,
      globalQuery,
    } = findAttackDiscoveryAlertsParams;
    const includeUniqueAlertIds2 = true;
    const aggs = getFindAttackDiscoveryAlertsAggregation(includeUniqueAlertIds2);

    const index = this.getScheduledAndAdHocIndexPattern();

    const filter1 = combineFindAttackDiscoveryFilters({
      alertIds,
      connectorNames,
      end,
      executionUuid,
      ids,
      search,
      start,
      status,
    });

    const combinedFilter1 = getCombinedFilter({
      authenticatedUser,
      filter: filter1,
      shared,
    });
    console.log(`[TEST] combinedFilter: ${JSON.stringify(combinedFilter1)}`);

    const result1 = await findDocuments<AttackDiscoveryAlertDocument>({
      aggs,
      esClient,
      filter: combinedFilter1,
      index,
      logger,
      page,
      perPage,
      sortField,
      sortOrder: sortOrder as estypes.SortOrder,
    });

    const { uniqueAlertIds: uniqueAlertIds1 } = transformSearchResponseToAlerts({
      logger,
      response: result1.data,
      includeUniqueAlertIds: includeUniqueAlertIds2,
      enableFieldRendering,
      withReplacements,
    });

    const asdasdsa = {
      bool: {
        filter: {
          bool: {
            must: [],
            filter: [
              {
                bool: {
                  should: [{ term: { 'user.name': { value: 'jwlb3dme23' } } }],
                  minimum_should_match: 1,
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: '2025-10-29T23:00:00.000Z',
                    lte: '2025-10-30T22:59:59.999Z',
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ],
            should: [],
            must_not: [],
          },
        },
      },
    };

    const asdasdasdsad = {
      bool: {
        filter: {
          bool: {
            must: [],
            filter: [
              {
                bool: {
                  should: [{ match_phrase: { 'user.name': 'jwlb3dme23' } }],
                  minimum_should_match: 1,
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: '2025-10-29T23:00:00.000Z',
                    lte: '2025-10-30T22:59:59.999Z',
                    format: 'strict_date_optional_time',
                  },
                },
              },
              {
                terms: {
                  _id: [
                    'b04728ea425d2212554b247080ca8dfc8e5b798362197e77017173c283497782',
                    '617674934c092513acc43b2632b193950b821740b8b347f24a572ad4d5367418',
                  ],
                },
              },
            ],
            should: [],
            must_not: [],
          },
        },
      },
    };

    // uniqueAlertIds
    const convertedGlobalQuery = JSON.parse(globalQuery ?? '{}');
    convertedGlobalQuery.bool.filter.bool.filter.push({
      terms: { _id: uniqueAlertIds1 },
    });
    // console.log(`[TEST] convertedGlobalQuery: ${JSON.stringify(convertedGlobalQuery)}`);

    const config: EsQueryConfig = {
      allowLeadingWildcards: true,
      dateFormatTZ: 'Zulu',
      ignoreFilterIfFieldNotInIndex: false,
      queryStringOptions: { analyze_wildcard: true },
    };
    const esQuery = buildEsQuery(
      undefined,
      [],
      convertedGlobalQuery.bool.filter.bool.filter,
      config
    );
    // console.log(`[TEST] esQuery: ${JSON.stringify(esQuery)}`);

    const result2 = await esClient.search({
      index: '.alerts-security.alerts-default',
      query: esQuery,
      _source: false,
      size: 10_000,
      ignore_unavailable: true,
    });
    console.log(`[TEST] alerts.result2: ${JSON.stringify(result2.hits.hits)}`);
    const filteredAlertIds = result2.hits.hits.map(({ _id }) => _id);
    console.log(`[TEST] filteredAlertIds: ${JSON.stringify(filteredAlertIds)}`);

    if (!filteredAlertIds.length) {
      return {
        connector_names: [],
        data: [],
        page: 0,
        per_page: 0,
        total: 0,
        unique_alert_ids_count: 0,
      };
    }

    const filter = combineFindAttackDiscoveryFilters({
      alertIds: filteredAlertIds as string[],
      connectorNames,
      end,
      executionUuid,
      ids,
      search,
      start,
      status,
    });

    const combinedFilter = getCombinedFilter({
      authenticatedUser,
      filter,
      shared,
    });
    console.log(`[TEST] combinedFilter: ${JSON.stringify(combinedFilter)}`);

    const result = await findDocuments<AttackDiscoveryAlertDocument>({
      aggs,
      esClient,
      filter: combinedFilter,
      index,
      logger,
      page,
      perPage,
      sortField,
      sortOrder: sortOrder as estypes.SortOrder,
    });

    const {
      connectorNames: alertConnectorNames,
      data,
      uniqueAlertIdsCount,
      uniqueAlertIds,
    } = transformSearchResponseToAlerts({
      logger,
      response: result1.data,
      includeUniqueAlertIds: includeUniqueAlertIds2,
      enableFieldRendering,
      withReplacements,
    });

    return {
      connector_names: alertConnectorNames,
      data,
      page: result.page,
      per_page: result.perPage,
      total: result.total,
      unique_alert_ids_count: uniqueAlertIdsCount,
      ...(includeUniqueAlertIds2 ? { unique_alert_ids: uniqueAlertIds } : {}),
    };
  };

  public async refreshEventLogIndex(eventLogIndex: string): Promise<void> {
    const esClient = await this.options.elasticsearchClientPromise;

    await esClient.indices.refresh({
      allow_no_indices: true,
      ignore_unavailable: true,
      index: eventLogIndex,
    });
  }

  public getAttackDiscoveryGenerations = async ({
    authenticatedUser,
    eventLogIndex,
    getAttackDiscoveryGenerationsParams,
    logger,
    spaceId,
  }: {
    authenticatedUser: AuthenticatedUser;
    eventLogIndex: string;
    getAttackDiscoveryGenerationsParams: {
      size: number;
      start?: string;
      end?: string;
    };
    logger: Logger;
    spaceId: string;
  }): Promise<GetAttackDiscoveryGenerationsResponse> => {
    const esClient = await this.options.elasticsearchClientPromise;

    const { size, start, end } = getAttackDiscoveryGenerationsParams;
    const generationsQuery = getAttackDiscoveryGenerationsQuery({
      authenticatedUser,
      end,
      eventLogIndex,
      size,
      spaceId,
      start,
    });

    return getAttackDiscoveryGenerations({
      authenticatedUser,
      esClient,
      eventLogIndex,
      generationsQuery,
      getAttackDiscoveryGenerationsParams,
      logger,
      spaceId,
    });
  };

  public bulkUpdateAttackDiscoveryAlerts = async ({
    authenticatedUser,
    enableFieldRendering,
    esClient,
    ids,
    kibanaAlertWorkflowStatus,
    logger,
    visibility,
    withReplacements,
  }: {
    authenticatedUser: AuthenticatedUser;
    esClient: ElasticsearchClient;
    enableFieldRendering: boolean;
    ids: string[];
    kibanaAlertWorkflowStatus?: 'acknowledged' | 'closed' | 'open';
    logger: Logger;
    visibility?: 'not_shared' | 'shared';
    withReplacements: boolean;
  }): Promise<AttackDiscoveryApiAlert[]> => {
    const PER_PAGE = 1000;

    const indexPattern = this.getScheduledAndAdHocIndexPattern();

    if (ids.length === 0) {
      logger.debug(
        () =>
          `No Attack discovery alerts to update for index ${indexPattern} in bulkUpdateAttackDiscoveryAlerts`
      );

      return [];
    }

    try {
      logger.debug(
        () =>
          `Updating Attack discovery alerts in index ${indexPattern} with alert ids: ${ids.join(
            ', '
          )}`
      );

      const updateByQuery = getUpdateAttackDiscoveryAlertsQuery({
        authenticatedUser,
        ids,
        indexPattern,
        kibanaAlertWorkflowStatus,
        visibility,
      });

      const updateResponse = await esClient.updateByQuery(updateByQuery);

      await esClient.indices.refresh({
        allow_no_indices: true,
        ignore_unavailable: true,
        index: indexPattern,
      });

      if (updateResponse.failures != null && updateResponse.failures.length > 0) {
        const errorDetails = updateResponse.failures.flatMap((failure) => {
          const error = failure?.cause;

          if (error == null) {
            return [];
          }

          const id = failure.id != null ? ` id: ${failure.id}` : '';
          const details = `\nError updating attack discovery alert${id} ${error}`;
          return [details];
        });

        const allErrorDetails = errorDetails.join(', ');
        throw new Error(`Failed to update attack discovery alerts ${allErrorDetails}`);
      }

      const alertsResult = await this.findAttackDiscoveryAlerts({
        authenticatedUser,
        esClient,
        findAttackDiscoveryAlertsParams: {
          enableFieldRendering,
          ids,
          page: FIRST_PAGE,
          perPage: PER_PAGE,
          sortField: '@timestamp',
          withReplacements,
        },
        logger,
      });

      return alertsResult.data;
    } catch (err) {
      logger.error(`Error updating Attack discovery alerts: ${err} for ids: ${ids.join(', ')}`);
      throw err;
    }
  };

  public getAttackDiscoveryGenerationById = async ({
    authenticatedUser,
    eventLogIndex,
    executionUuid,
    logger,
    spaceId,
  }: {
    authenticatedUser: AuthenticatedUser;
    eventLogIndex: string;
    executionUuid: string;
    logger: Logger;
    spaceId: string;
  }): Promise<PostAttackDiscoveryGenerationsDismissResponse> => {
    const esClient = await this.options.elasticsearchClientPromise;

    const generationByIdQuery = getAttackDiscoveryGenerationByIdQuery({
      authenticatedUser,
      eventLogIndex,
      executionUuid,
      spaceId,
    });

    const result = await getAttackDiscoveryGenerations({
      authenticatedUser,
      esClient,
      eventLogIndex,
      generationsQuery: generationByIdQuery,
      getAttackDiscoveryGenerationsParams: { size: 1 },
      logger,
      spaceId,
    });

    if (result?.generations[0] == null) {
      throw Object.assign(new Error(`Generation with execution_uuid ${executionUuid} not found`), {
        statusCode: 404,
      });
    }

    return result?.generations[0];
  };
}
