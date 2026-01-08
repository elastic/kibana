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

import type { AIAssistantDataClientParams } from '../../../ai_assistant_data_clients';
import { AIAssistantDataClient } from '../../../ai_assistant_data_clients';
import { findDocuments } from '../../../ai_assistant_data_clients/find';
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
    } = findAttackDiscoveryAlertsParams;
    const aggs = getFindAttackDiscoveryAlertsAggregation(includeUniqueAlertIds);

    const index = this.getScheduledAndAdHocIndexPattern();

    const filter = combineFindAttackDiscoveryFilters({
      alertIds,
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
      response: result.data,
      includeUniqueAlertIds,
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
      ...(includeUniqueAlertIds ? { unique_alert_ids: uniqueAlertIds } : {}),
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
