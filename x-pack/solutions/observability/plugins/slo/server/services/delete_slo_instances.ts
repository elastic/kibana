/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { ALL_VALUE, DeleteSLOInstancesParams } from '@kbn/slo-schema';
import {
  SLI_DESTINATION_INDEX_PATTERN,
  SUMMARY_DESTINATION_INDEX_PATTERN,
} from '../../common/constants';
import { IllegalArgumentError } from '../errors';

type List = DeleteSLOInstancesParams['list'];

export class DeleteSLOInstances {
  constructor(private esClient: ElasticsearchClient) {}

  public async execute(params: DeleteSLOInstancesParams): Promise<void> {
    const containsAllValueInstanceId = params.list.some((item) => item.instanceId === ALL_VALUE);
    if (containsAllValueInstanceId) {
      throw new IllegalArgumentError("Cannot delete an SLO instance '*'");
    }

    await this.deleteRollupData(params.list);
    await this.deleteSummaryData(params.list);
  }

  // Delete rollup data when excluding rollup data is not explicitly requested
  private async deleteRollupData(list: List): Promise<void> {
    await this.esClient.deleteByQuery({
      index: SLI_DESTINATION_INDEX_PATTERN,
      wait_for_completion: false,
      query: {
        bool: {
          should: list
            .filter((item) => item.excludeRollup !== true)
            .map((item) => ({
              bool: {
                must: [
                  { term: { 'slo.id': item.sloId } },
                  { term: { 'slo.instanceId': item.instanceId } },
                ],
              },
            })),
        },
      },
    });
  }

  private async deleteSummaryData(list: List): Promise<void> {
    await this.esClient.deleteByQuery({
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      refresh: true,
      query: {
        bool: {
          should: list.map((item) => ({
            bool: {
              must: [
                { term: { 'slo.id': item.sloId } },
                { term: { 'slo.instanceId': item.instanceId } },
              ],
            },
          })),
        },
      },
    });
  }
}
