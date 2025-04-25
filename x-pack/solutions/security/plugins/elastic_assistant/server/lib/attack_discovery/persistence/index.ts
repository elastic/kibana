/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { AuthenticatedUser } from '@kbn/core-security-common';
import type { Logger } from '@kbn/core/server';

import {
  AIAssistantDataClient,
  AIAssistantDataClientParams,
} from '../../../ai_assistant_data_clients';
import { findAllAttackDiscoveries } from './find_all_attack_discoveries/find_all_attack_discoveries';
import { combineFindAttackDiscoveryFilters } from './combine_find_attack_discovery_filters';
import { findAttackDiscoveryByConnectorId } from './find_attack_discovery_by_connector_id/find_attack_discovery_by_connector_id';
import { updateAttackDiscovery } from './update_attack_discovery/update_attack_discovery';
import { createAttackDiscovery } from './create_attack_discovery/create_attack_discovery';
import { createAttackDiscoveryAlerts } from './create_attack_discovery_alerts';
import { getIndexTemplateAndPattern } from '../../data_stream/helpers';
import { getAttackDiscovery } from './get_attack_discovery/get_attack_discovery';
import { getAttackDiscoveryGenerations } from './get_attack_discovery_generations';
import { getAttackDiscoveryGenerationByIdQuery } from './get_attack_discovery_generation_by_id_query';
import { getAttackDiscoveryGenerationsQuery } from './get_attack_discovery_generations_query';
import { getCombinedFilter } from './get_combined_filter';
import { getFindAttackDiscoveryAlertsAggregation } from './get_find_attack_discovery_alerts_aggregation';
import { AttackDiscoveryAlertDocument } from '../schedules/types';
import { transformSearchResponseToAlerts } from './transforms/transform_search_response_to_alerts';
import { IIndexPatternString } from '../../../types';
import { getScheduledAndAdHocIndexPattern } from './get_scheduled_and_ad_hoc_index_pattern';
import { getUpdateAttackDiscoveryAlertsQuery } from '../get_update_attack_discovery_alerts_query';

const FIRST_PAGE = 1; // CAUTION: sever-side API uses a 1-based page index convention (for consistency with similar existing APIs)
const DEFAULT_PER_PAGE = 10;

type AttackDiscoveryDataClientParams = AIAssistantDataClientParams & {
  attackDiscoveryAlertsIndexPatternsResourceName: string;
};

export class AttackDiscoveryDataClient extends AIAssistantDataClient {
  private attackDiscoveryAlertsIndexTemplateAndPattern: IIndexPatternString;

  constructor(public readonly options: AttackDiscoveryDataClientParams) {
    super(options);

    this.attackDiscoveryAlertsIndexTemplateAndPattern = getIndexTemplateAndPattern(
      this.options.attackDiscoveryAlertsIndexPatternsResourceName,
      this.options.spaceId ?? DEFAULT_NAMESPACE_STRING
    );
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

  public createAttackDiscoveryAlerts = async ({
    authenticatedUser,
    createAttackDiscoveryAlertsParams,
  }: {
    authenticatedUser: AuthenticatedUser;
    createAttackDiscoveryAlertsParams: CreateAttackDiscoveryAlertsParams;
  }): Promise<AttackDiscoveryAlert[]> => {
    const esClient = await this.options.elasticsearchClientPromise;

    return createAttackDiscoveryAlerts({
      attackDiscoveryAlertsIndex: this.attackDiscoveryAlertsIndexTemplateAndPattern.alias,
      authenticatedUser,
      createAttackDiscoveryAlertsParams,
      esClient,
      logger: this.options.logger,
      spaceId: this.spaceId,
    });
  };

  public findAttackDiscoveryAlerts = async ({
    authenticatedUser,
    findAttackDiscoveryAlertsParams,
    logger,
  }: {
    authenticatedUser: AuthenticatedUser;
    findAttackDiscoveryAlertsParams: FindAttackDiscoveryAlertsParams;
    logger: Logger;
  }): Promise<AttackDiscoveryFindResponse> => {
    const aggs = getFindAttackDiscoveryAlertsAggregation();

    const {
      alertIds,
      connectorNames,
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

    const spaceId = this.spaceId;
    const index = getScheduledAndAdHocIndexPattern(spaceId);

    const result = await this.findDocuments<AttackDiscoveryAlertDocument>({
      aggs,
      filter: combinedFilter,
      index,
      page,
      perPage,
      sortField,
      sortOrder,
    });

    const {
      connectorNames: alertConnectorNames,
      data,
      uniqueAlertIdsCount,
    } = transformSearchResponseToAlerts({
      logger,
      response: result.data,
    });

    return {
      connector_names: alertConnectorNames,
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
    ids,
    kibanaAlertWorkflowStatus,
    logger,
    visibility,
  }: {
    authenticatedUser: AuthenticatedUser;
    ids: string[];
    kibanaAlertWorkflowStatus?: 'acknowledged' | 'closed' | 'open';
    logger: Logger;
    visibility?: 'not_shared' | 'shared';
  }): Promise<AttackDiscoveryAlert[]> => {
    const PER_PAGE = 1000;

    const esClient = await this.options.elasticsearchClientPromise;

    const indexPattern = getScheduledAndAdHocIndexPattern(this.spaceId);

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
