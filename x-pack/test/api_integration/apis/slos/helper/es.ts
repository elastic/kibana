/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Client } from '@elastic/elasticsearch';
import {
  SLO_DESTINATION_INDEX_PATTERN,
  SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
} from '@kbn/observability-plugin/common/slo/constants';

export class SloEsClient {
  constructor(private esClient: Client) {}

  public async getSLOSummaryDataById(id: string) {
    return await this.esClient.search({
      index: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
      body: {
        query: {
          bool: {
            filter: {
              term: { 'slo.id': id },
            },
          },
        },
      },
    });
  }

  public async getSLORollupDataById(id: string) {
    return await this.esClient.search({
      index: SLO_DESTINATION_INDEX_PATTERN,
      body: {
        query: {
          bool: {
            filter: {
              term: { 'slo.id': id },
            },
          },
        },
      },
    });
  }
}
