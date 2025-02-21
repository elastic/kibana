/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Client } from '@elastic/elasticsearch';
import {
  SLI_DESTINATION_INDEX_PATTERN,
  SUMMARY_DESTINATION_INDEX_PATTERN,
} from '@kbn/slo-plugin/common/constants';

export class SloEsClient {
  constructor(private esClient: Client) {}

  public async getSLOSummaryDataById(id: string) {
    return await this.esClient.search({
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      body: {
        query: {
          bool: {
            filter: [
              {
                term: { 'slo.id': id },
              },
              {
                term: { isTempDoc: false },
              },
            ],
          },
        },
      },
    });
  }

  public async getSLORollupDataById(id: string) {
    return await this.esClient.search({
      index: SLI_DESTINATION_INDEX_PATTERN,
      body: {
        query: {
          bool: {
            filter: [
              {
                term: { 'slo.id': id },
              },
            ],
          },
        },
      },
    });
  }

  public async deleteTestSourceData() {
    try {
      await this.esClient.deleteByQuery({
        index: 'kbn-data-forge-fake_hosts*',
        query: { term: { 'system.network.name': 'eth1' } },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('SLO api integration test data not found');
    }
  }
}
