/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SUMMARY_DESTINATION_INDEX_NAME } from '@kbn/slo-plugin/common/constants';
import { TOTAL_INDEX_PRIVILEGE_SET_EDITOR } from '@kbn/slo-plugin/server/services/get_diagnosis';
import {
  CreateSLOInput,
  fetchHistoricalSummaryParamsSchema,
  FetchHistoricalSummaryResponse,
  FindSLODefinitionsResponse,
} from '@kbn/slo-schema';
import * as t from 'io-ts';
import type { Client } from '@elastic/elasticsearch';
import type { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { retryForSuccess } from '@kbn/ftr-common-functional-services';
import { ToolingLog } from '@kbn/tooling-log';
import { FtrProviderContext } from '../ftr_provider_context';

type FetchHistoricalSummaryParams = t.OutputOf<
  typeof fetchHistoricalSummaryParamsSchema.props.body
>;

const debugLog = ToolingLog.bind(ToolingLog, { level: 'debug', writeTo: process.stdout });

async function waitForIndexToBeEmpty<T>({
  esClient,
  indexName,
}: {
  esClient: Client;
  indexName: string;
}): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
  return await retryForSuccess(new debugLog({ context: 'waitForIndexToBeEmpty' }), {
    timeout: 20_000,
    methodName: 'waitForIndexToBeEmpty',
    block: async () => {
      const response = await esClient.search<T>({ index: indexName, rest_total_hits_as_int: true });
      // @ts-expect-error upgrade typescript v5.1.6
      if (response.hits.total != null && response.hits.total > 0) {
        throw new Error(`Found ${response.hits.total} docs.`);
      }
      return response;
    },
    retryCount: 10,
  });
}

export function SloApiProvider({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esClient = getService('es');
  const security = getService('security');

  return {
    async createUser() {
      const username = 'slo_editor';
      const roleName = 'slo_editor';
      try {
        await security.user.delete(username);
        await security.role.delete(roleName);
      } catch (error) {
        const status = error.response.status;
        if (status !== 404) {
          throw error;
        }
      }
      const password = 'changeme';

      await security.role.create(roleName, {
        elasticsearch: {
          indices: [
            {
              names: ['.slo-observability.*'],
              privileges: TOTAL_INDEX_PRIVILEGE_SET_EDITOR,
            },
          ],
        },
      });

      await security.user.create(username, {
        password,
        roles: [roleName, 'editor'],
      });
    },
    async create(params: CreateSLOInput) {
      const slo = await supertest
        .post('/api/observability/slos')
        .set('kbn-xsrf', 'true')
        .auth('slo_editor', 'changeme')
        .send(params)
        .expect(200);

      return slo;
    },
    async reset(id: string) {
      const response = supertest
        .post(`/api/observability/slos/${id}/_reset`)
        .auth('slo_editor', 'changeme')
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      return response;
    },
    async getDefinitions({ search }: { search?: string } = {}) {
      const url = `/api/observability/slos/_definitions${search ? `?search=${search}` : ''}`;
      const response = await supertest
        .get(url)
        .set('kbn-xsrf', 'true')
        .auth('slo_editor', 'changeme')
        .send()
        .expect(200);

      return response;
    },
    async delete(id: string) {
      await supertest
        .delete(`/api/observability/slos/${id}`)
        .set('kbn-xsrf', 'true')
        .auth('slo_editor', 'changeme')
        .send()
        .expect(204);
    },
    async deleteAllSLOs() {
      const response = await supertest
        .get(`/api/observability/slos/_definitions`)
        .set('kbn-xsrf', 'true')
        .auth('slo_editor', 'changeme')
        .send()
        .expect(200);
      for (const { id } of (response.body as FindSLODefinitionsResponse).results) {
        await supertest
          .delete(`/api/observability/slos/${id}`)
          .set('kbn-xsrf', 'true')
          .auth('slo_editor', 'changeme')
          .send()
          .expect(204);
      }
      await waitForIndexToBeEmpty({ esClient, indexName: SUMMARY_DESTINATION_INDEX_NAME });
    },
    async fetchHistoricalSummary(
      params: FetchHistoricalSummaryParams
    ): Promise<FetchHistoricalSummaryResponse> {
      const { body } = await supertest
        .post(`/internal/observability/slos/_historical_summary`)
        .set('kbn-xsrf', 'foo')
        .auth('slo_editor', 'changeme')
        .set('elastic-api-version', '1')
        .send(params);

      return body;
    },
  };
}
