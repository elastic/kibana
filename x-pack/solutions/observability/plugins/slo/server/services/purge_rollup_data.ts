/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { Duration } from '@kbn/slo-schema';
import { DeleteByQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../common/constants';

export class PurgeRollupData {
  constructor(private esClient: ElasticsearchClient) {}

  public async execute(sloIds: string[], age: Duration | Date): Promise<DeleteByQueryResponse> {
    const comparisonStamp = age instanceof Date ? age : `now-${age.format()}`;
    return this.esClient.deleteByQuery({
      index: SLI_DESTINATION_INDEX_PATTERN,
      refresh: false,
      wait_for_completion: false,
      conflicts: 'proceed',
      slices: 'auto',
      query: {
        bool: {
          filter: [
            {
              terms: { 'slo.id': sloIds },
            },
            {
              range: {
                '@timestamp': {
                  lte: comparisonStamp,
                },
              },
            },
          ],
        },
      },
    });
  }
}
