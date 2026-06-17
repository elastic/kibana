/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AggregationsCompositeAggregateKey } from '@elastic/elasticsearch/lib/api/types';
import {
  SUMMARY_DESTINATION_INDEX_PATTERN,
  SUMMARY_TEMP_INDEX_NAME,
} from '../../../../common/constants';

interface AggBucketKey extends AggregationsCompositeAggregateKey {
  spaceId: string;
  id: string;
}

interface AggBucket {
  key: AggBucketKey;
  doc_count: number;
}

export interface AggResults {
  duplicate_ids: {
    after_key: AggBucketKey | undefined;
    buckets: AggBucket[];
  };
}

export class CleanUpTempSummary {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger,
    private readonly abortController: AbortController
  ) {}

  public async execute(): Promise<void> {
    const openCircuitBreaker = await this.shouldOpenCircuitBreaker();
    if (openCircuitBreaker) {
      this.logger.debug('No temporary documents found, skipping.');
      return;
    }

    let searchAfterKey: AggBucketKey | undefined;
    do {
      const { buckets, nextSearchAfterKey } = await this.findDuplicateTemporaryDocuments(
        searchAfterKey
      );
      searchAfterKey = nextSearchAfterKey;

      if (buckets.length > 0) {
        await this.deleteDuplicateTemporaryDocuments(buckets);
      }
    } while (searchAfterKey);
  }

  private async shouldOpenCircuitBreaker() {
    const results = await this.esClient.count(
      { index: SUMMARY_TEMP_INDEX_NAME, terminate_after: 1 },
      { signal: this.abortController.signal }
    );
    return results.count === 0;
  }

  private async findDuplicateTemporaryDocuments(searchAfterKey: AggBucketKey | undefined) {
    this.logger.debug('Searching for duplicate temporary documents');
    const results = await this.esClient.search<unknown, AggResults>(
      {
        index: SUMMARY_DESTINATION_INDEX_PATTERN,
        size: 0,
        aggs: {
          duplicate_ids: {
            composite: {
              size: 10000,
              after: searchAfterKey,
              sources: [
                {
                  spaceId: {
                    terms: {
                      field: 'spaceId',
                    },
                  },
                },
                {
                  id: {
                    terms: {
                      field: 'slo.id',
                    },
                  },
                },
              ],
            },
            aggs: {
              cardinality_istempdoc: {
                cardinality: {
                  field: 'isTempDoc',
                },
              },
              find_duplicates: {
                bucket_selector: {
                  buckets_path: {
                    cardinality: 'cardinality_istempdoc',
                  },
                  script: 'params.cardinality == 2',
                },
              },
            },
          },
        },
      },
      { signal: this.abortController.signal }
    );

    const buckets = (results.aggregations?.duplicate_ids.buckets ?? []).map((bucket) => bucket.key);
    const nextSearchAfterKey = results.aggregations?.duplicate_ids.after_key;

    this.logger.debug(`Found ${buckets.length} duplicate temporary documents`);

    return { buckets, nextSearchAfterKey };
  }

  private async deleteDuplicateTemporaryDocuments(buckets: AggBucketKey[]) {
    this.logger.debug(`Deleting ${buckets.length} duplicate temporary documents`);
    await this.esClient.deleteByQuery(
      {
        index: SUMMARY_TEMP_INDEX_NAME,
        wait_for_completion: false,
        slices: 'auto',
        conflicts: 'proceed',
        query: {
          bool: {
            should: buckets.map((bucket) => {
              return {
                bool: {
                  must: [
                    {
                      term: {
                        isTempDoc: true,
                      },
                    },
                    {
                      term: {
                        'slo.id': bucket.id,
                      },
                    },
                    {
                      term: {
                        spaceId: bucket.spaceId,
                      },
                    },
                  ],
                },
              };
            }),
            minimum_should_match: 1,
          },
        },
      },
      { signal: this.abortController.signal }
    );
  }
}
