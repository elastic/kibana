/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { CountResponse } from '@elastic/elasticsearch/lib/api/types';

export class PurgeRollupData {
  constructor(private esClient: ElasticsearchClient) {}

  public async execute(sloId: string): Promise<CountResponse> {
    return await this.esClient.count({
      index: SLI_DESTINATION_INDEX_PATTERN,
      query: {
        bool: {
          filter: [
            {
              term: {
                'slo.id': sloId,
              },
            },
            //todo multiply by 3, use slo settings
            { range: { summaryUpdatedAt: { lte: 'now-48h' } } },
          ],
        },
      },
    });
  }
}
