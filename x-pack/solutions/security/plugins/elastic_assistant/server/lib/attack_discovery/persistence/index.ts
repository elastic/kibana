/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  type AttackDiscoveryAlert,
  type AttackDiscoveryCreateProps,
  type AttackDiscoveryUpdateProps,
  type AttackDiscoveryResponse,
  type CreateAttackDiscoveryAlertsParams,
  type FindAttackDiscoveryAlertsParams,
  type AttackDiscoveryFindResponse,
  type GetAttackDiscoveryGenerationsResponse,
  type PostAttackDiscoveryGenerationsDismissResponse,
} from '@kbn/elastic-assistant-common';
import { AuthenticatedUser } from '@kbn/core-security-common';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { IRuleDataClient } from '@kbn/rule-registry-plugin/server';

import {
  AIAssistantDataClient,
  AIAssistantDataClientParams,
} from '../../../ai_assistant_data_clients';
import { findDocuments } from '../../../ai_assistant_data_clients/find';
import { findAllAttackDiscoveries } from './find_all_attack_discoveries/find_all_attack_discoveries';
import { combineFindAttackDiscoveryFilters } from './combine_find_attack_discovery_filters';
import { findAttackDiscoveryByConnectorId } from './find_attack_discovery_by_connector_id/find_attack_discovery_by_connector_id';
import { updateAttackDiscovery } from './update_attack_discovery/update_attack_discovery';
import { createAttackDiscovery } from './create_attack_discovery/create_attack_discovery';
import { createAttackDiscoveryAlerts } from './create_attack_discovery_alerts';
import { getAttackDiscovery } from './get_attack_discovery/get_attack_discovery';
import { getAttackDiscoveryGenerations } from './get_attack_discovery_generations';
import { getAttackDiscoveryGenerationByIdQuery } from './get_attack_discovery_generation_by_id_query';
import { getAttackDiscoveryGenerationsQuery } from './get_attack_discovery_generations_query';
import { getCombinedFilter } from './get_combined_filter';
import { getFindAttackDiscoveryAlertsAggregation } from './get_find_attack_discovery_alerts_aggregation';
import { AttackDiscoveryAlertDocument } from '../schedules/types';
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

  /**
   * Fetches an attack discovery
   * @param options
   * @param options.id The existing attack discovery id.
   * @param options.authenticatedUser Current authenticated user.
   * @returns The attack discovery response
   */
  public getAttackDiscovery = async ({
    id,
    authenticatedUser,
  }: {
    id: string;
    authenticatedUser: AuthenticatedUser;
  }): Promise<AttackDiscoveryResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return getAttackDiscovery({
      esClient,
      logger: this.options.logger,
      attackDiscoveryIndex: this.indexTemplateAndPattern.alias,
      id,
      user: authenticatedUser,
    });
  };

  /**
   * Creates an attack discovery, if given at least the "apiConfig"
   * @param options
   * @param options.attackDiscoveryCreate
   * @param options.authenticatedUser
   * @returns The Attack Discovery created
   */
  public createAttackDiscovery = async ({
    attackDiscoveryCreate,
    authenticatedUser,
  }: {
    attackDiscoveryCreate: AttackDiscoveryCreateProps;
    authenticatedUser: AuthenticatedUser;
  }): Promise<AttackDiscoveryResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return createAttackDiscovery({
      esClient,
      logger: this.options.logger,
      attackDiscoveryIndex: this.indexTemplateAndPattern.alias,
      spaceId: this.spaceId,
      user: authenticatedUser,
      attackDiscoveryCreate,
    });
  };

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
  }): Promise<AttackDiscoveryAlert[]> => {
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

  // Runs an aggregation only bound to the (optional) alertIds and date range
  // to prevent the connector names from being filtered-out as the user applies more filters:
  public getAlertConnectorNames = async ({
    alertIds,
    authenticatedUser,
    end,
    esClient,
    ids,
    index,
    logger,
    page,
    perPage,
    sortField,
    sortOrder,
    start,
  }: {
    alertIds: string[] | undefined;
    authenticatedUser: AuthenticatedUser;
    end: string | undefined;
    esClient: ElasticsearchClient;
    ids: string[] | undefined;
    index: string;
    logger: Logger;
    page: number;
    perPage: number;
    sortField: string;
    sortOrder: string;
    start: string | undefined;
  }): Promise<string[]> => {
    const aggs = getFindAttackDiscoveryAlertsAggregation();

    // just use the (optional) alertIds and date range to prevent the connector
    // names from being filtered-out as the user applies more filters:
    const connectorsAggsFilter = combineFindAttackDiscoveryFilters({
      alertIds, // optional
      end,
      ids,
      start,
    });

    const combinedConnectorsAggsFilter = getCombinedFilter({
      authenticatedUser,
      filter: connectorsAggsFilter,
    });

    const aggsResult = await findDocuments<AttackDiscoveryAlertDocument>({
      aggs,
      esClient,
      filter: combinedConnectorsAggsFilter,
      index,
      logger,
      page,
      perPage,
      sortField,
      sortOrder: sortOrder as estypes.SortOrder,
    });

    const { connectorNames } = transformSearchResponseToAlerts({
      logger,
      response: aggsResult.data,
    });

    return connectorNames;
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
    const aggs = getFindAttackDiscoveryAlertsAggregation();
    const {
      alertIds,
      connectorNames, // <-- as a filter input
      end,
      ids,
      search,
      shared,
      sortField = '@timestamp',
      sortOrder = 'desc',
      start,
      status,
      page = FIRST_PAGE,
      perPage = DEFAULT_PER_PAGE,
    } = findAttackDiscoveryAlertsParams;

    const index = this.getScheduledAndAdHocIndexPattern();

    const filter = combineFindAttackDiscoveryFilters({
      alertIds,
      connectorNames,
      end,
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

    const { data, uniqueAlertIdsCount } = transformSearchResponseToAlerts({
      logger,
      response: result.data,
    });

    const alertConnectorNames = await this.getAlertConnectorNames({
      alertIds,
      authenticatedUser,
      end,
      esClient,
      ids,
      index,
      logger,
      page,
      perPage,
      sortField,
      sortOrder,
      start,
    });

    return {
      connector_names: alertConnectorNames, // <-- from the separate aggregation
      data,
      page: result.page,
      per_page: result.perPage,
      total: result.total,
      unique_alert_ids_count: uniqueAlertIdsCount,
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
    esClient,
    ids,
    kibanaAlertWorkflowStatus,
    logger,
    visibility,
  }: {
    authenticatedUser: AuthenticatedUser;
    esClient: ElasticsearchClient;
    ids: string[];
    kibanaAlertWorkflowStatus?: 'acknowledged' | 'closed' | 'open';
    logger: Logger;
    visibility?: 'not_shared' | 'shared';
  }): Promise<AttackDiscoveryAlert[]> => {
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
          ids,
          page: FIRST_PAGE,
          perPage: PER_PAGE,
          sortField: '@timestamp',
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
      throw new Error(`Generation with execution_uuid ${executionUuid} not found`);
    }

    return result?.generations[0];
  };

  /**
   * Find attack discovery by apiConfig connectorId
   * @param options
   * @param options.connectorId
   * @param options.authenticatedUser
   * @returns The Attack Discovery found
   */
  public findAttackDiscoveryByConnectorId = async ({
    connectorId,
    authenticatedUser,
  }: {
    connectorId: string;
    authenticatedUser: AuthenticatedUser;
  }): Promise<AttackDiscoveryResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return findAttackDiscoveryByConnectorId({
      esClient,
      logger: this.options.logger,
      attackDiscoveryIndex: this.indexTemplateAndPattern.alias,
      connectorId,
      user: authenticatedUser,
    });
  };

  /**
   * Finds all attack discovery for authenticated user
   * @param options
   * @param options.authenticatedUser
   * @returns The Attack Discovery
   */
  public findAllAttackDiscoveries = async ({
    authenticatedUser,
  }: {
    authenticatedUser: AuthenticatedUser;
  }): Promise<AttackDiscoveryResponse[]> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return findAllAttackDiscoveries({
      esClient,
      logger: this.options.logger,
      attackDiscoveryIndex: this.indexTemplateAndPattern.alias,
      user: authenticatedUser,
    });
  };

  /**
   * Updates an attack discovery
   * @param options
   * @param options.attackDiscoveryUpdateProps
   * @param options.authenticatedUser
   */
  public updateAttackDiscovery = async ({
    attackDiscoveryUpdateProps,
    authenticatedUser,
  }: {
    attackDiscoveryUpdateProps: AttackDiscoveryUpdateProps;
    authenticatedUser: AuthenticatedUser;
  }): Promise<AttackDiscoveryResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return updateAttackDiscovery({
      esClient,
      logger: this.options.logger,
      attackDiscoveryIndex: attackDiscoveryUpdateProps.backingIndex,
      attackDiscoveryUpdateProps,
      user: authenticatedUser,
    });
  };
}
