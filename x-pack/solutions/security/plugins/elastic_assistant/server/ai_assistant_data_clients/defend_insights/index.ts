/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';

import type {
  DefendInsightCreateProps,
  DefendInsightUpdateProps,
  DefendInsightsUpdateProps,
  DefendInsightsResponse,
  DefendInsightsGetRequestQuery,
} from '@kbn/elastic-assistant-common';
import type { AuthenticatedUser } from '@kbn/core-security-common';

import type { AIAssistantDataClientParams } from '..';
import type { EsDefendInsightSchema } from './types';

import { AIAssistantDataClient } from '..';
import { getDefendInsight } from './get_defend_insight';
import {
  queryParamsToEsQuery,
  transformESSearchToDefendInsights,
  transformToCreateScheme,
  transformToUpdateScheme,
} from './helpers';

const DEFAULT_PAGE_SIZE = 10;

export class DefendInsightsDataClient extends AIAssistantDataClient {
  constructor(public readonly options: AIAssistantDataClientParams) {
    super(options);
  }

  /**
   * Fetches a Defend insight
   * @param options
   * @param options.id The existing Defend insight id.
   * @param options.authenticatedUser Current authenticated user.
   * @returns The Defend insight response
   */
  public getDefendInsight = async ({
    id,
    authenticatedUser,
  }: {
    id: string;
    authenticatedUser: AuthenticatedUser;
  }): Promise<DefendInsightsResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return getDefendInsight({
      esClient,
      logger: this.options.logger,
      index: this.indexTemplateAndPattern.alias,
      id,
      user: authenticatedUser,
    });
  };

  /**
   * Creates a Defend insight, if given at least the "apiConfig"
   * @param options
   * @param options.defendInsightCreate
   * @param options.authenticatedUser
   * @returns The Defend insight created
   */
  public createDefendInsight = async ({
    defendInsightCreate,
    authenticatedUser,
  }: {
    defendInsightCreate: DefendInsightCreateProps;
    authenticatedUser: AuthenticatedUser;
  }): Promise<DefendInsightsResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    const logger = this.options.logger;
    const index = this.indexTemplateAndPattern.alias;
    const user = authenticatedUser;
    const id = defendInsightCreate?.id || uuidv4();
    const createdAt = new Date().toISOString();

    const body = transformToCreateScheme(createdAt, this.spaceId, user, defendInsightCreate);
    try {
      const response = await esClient.create({
        body,
        id,
        index,
        refresh: 'wait_for',
      });

      const createdDefendInsight = await getDefendInsight({
        esClient,
        index,
        id: response._id,
        logger,
        user,
      });
      return createdDefendInsight;
    } catch (err) {
      logger.error(`error creating Defend insight: ${err} with id: ${id}`);
      throw err;
    }
  };

  /**
   * Find Defend insights by params
   * @param options
   * @param options.params
   * @param options.authenticatedUser
   * @returns The Defend insights found
   */
  public findDefendInsightsByParams = async ({
    params,
    authenticatedUser,
  }: {
    params: DefendInsightsGetRequestQuery;
    authenticatedUser: AuthenticatedUser;
  }): Promise<DefendInsightsResponse[]> => {
    const esClient = await this.options.elasticsearchClientPromise;
    const logger = this.options.logger;
    const index = this.indexTemplateAndPattern.alias;
    const user = authenticatedUser;
    const termFilters = queryParamsToEsQuery(params);
    const filterByUser = [
      {
        nested: {
          path: 'users',
          query: {
            bool: {
              must: [
                {
                  match: user.profile_uid
                    ? { 'users.id': user.profile_uid }
                    : { 'users.name': user.username },
                },
              ],
            },
          },
        },
      },
    ];

    try {
      const query = {
        bool: {
          must: [...termFilters, ...filterByUser],
        },
      };
      const response = await esClient.search<EsDefendInsightSchema>({
        query,
        _source: true,
        ignore_unavailable: true,
        index,
        seq_no_primary_term: true,
        sort: [{ '@timestamp': 'desc' }],
        size: params.size || DEFAULT_PAGE_SIZE,
      });
      return transformESSearchToDefendInsights(response);
    } catch (err) {
      logger.error(`error fetching Defend insights: ${err} with params: ${JSON.stringify(params)}`);
      throw err;
    }
  };

  /**
   * Finds all Defend insight for authenticated user
   * @param options
   * @param options.authenticatedUser
   * @returns The Defend insight
   */
  public findAllDefendInsights = async ({
    authenticatedUser,
  }: {
    authenticatedUser: AuthenticatedUser;
  }): Promise<DefendInsightsResponse[]> => {
    const esClient = await this.options.elasticsearchClientPromise;
    const logger = this.options.logger;
    const index = this.indexTemplateAndPattern.alias;
    const user = authenticatedUser;
    const MAX_ITEMS = 10000;
    const filterByUser = [
      {
        nested: {
          path: 'users',
          query: {
            bool: {
              must: [
                {
                  match: user.profile_uid
                    ? { 'users.id': user.profile_uid }
                    : { 'users.name': user.username },
                },
              ],
            },
          },
        },
      },
    ];

    try {
      const response = await esClient.search<EsDefendInsightSchema>({
        query: {
          bool: {
            must: [...filterByUser],
          },
        },
        size: MAX_ITEMS,
        _source: true,
        ignore_unavailable: true,
        index,
        seq_no_primary_term: true,
      });
      const insights = transformESSearchToDefendInsights(response);
      return insights ?? [];
    } catch (err) {
      logger.error(`error fetching Defend insights: ${err}`);
      throw err;
    }
  };

  /**
   * Updates Defend insights
   * @param options
   * @param options.defendInsightsUpdateProps
   * @param options.authenticatedUser
   */
  public updateDefendInsights = async ({
    defendInsightsUpdateProps,
    authenticatedUser,
  }: {
    defendInsightsUpdateProps: DefendInsightsUpdateProps;
    authenticatedUser: AuthenticatedUser;
  }): Promise<DefendInsightsResponse[]> => {
    const esClient = await this.options.elasticsearchClientPromise;
    const logger = this.options.logger;
    const updatedAt = new Date().toISOString();

    let ids: string[] = [];
    const bulkParams = defendInsightsUpdateProps.flatMap((updateProp) => {
      const index = updateProp.backingIndex;
      const params = transformToUpdateScheme(updatedAt, updateProp);
      ids = [...ids, params.id];
      return [
        {
          update: {
            _index: index,
            _id: params.id,
          },
        },
        {
          doc: params,
        },
      ];
    });

    try {
      await esClient.bulk({ body: bulkParams, refresh: 'wait_for' });
      return this.findDefendInsightsByParams({ params: { ids }, authenticatedUser });
    } catch (err) {
      logger.warn(`error updating Defend insights: ${err} for IDs: ${ids}`);
      throw err;
    }
  };

  /**
   * Updates a Defend insight
   * @param options
   * @param options.defendInsightUpdateProps
   * @param options.authenticatedUser
   */
  public updateDefendInsight = async ({
    defendInsightUpdateProps,
    authenticatedUser,
  }: {
    defendInsightUpdateProps: DefendInsightUpdateProps;
    authenticatedUser: AuthenticatedUser;
  }): Promise<DefendInsightsResponse | null> => {
    return (
      await this.updateDefendInsights({
        defendInsightsUpdateProps: [defendInsightUpdateProps],
        authenticatedUser,
      })
    )[0];
  };
}
