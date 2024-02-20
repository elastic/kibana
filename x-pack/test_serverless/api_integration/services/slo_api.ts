/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

type DurationUnit = 'm' | 'h' | 'd' | 'w' | 'M';

interface Duration {
  value: number;
  unit: DurationUnit;
}

interface WindowSchema {
  id: string;
  burnRateThreshold: number;
  maxBurnRateThreshold: number;
  longWindow: Duration;
  shortWindow: Duration;
  actionGroup: string;
}

export interface SloBurnRateRuleParams {
  sloId: string;
  windows: WindowSchema[];
}

interface SloParams {
  id?: string;
  name: string;
  description: string;
  indicator: {
    type: 'sli.kql.custom';
    params: {
      index: string;
      good: string;
      total: string;
      timestampField: string;
    };
  };
  timeWindow: {
    duration: string;
    type: string;
  };
  budgetingMethod: string;
  objective: {
    target: number;
  };
  groupBy: string;
}

export function SloApiProvider({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');
  const retry = getService('retry');
  const requestTimeout = 30 * 1000;
  const retryTimeout = 180 * 1000;

  return {
    async create(slo: SloParams) {
      const { body } = await supertest
        .post(`/api/observability/slos`)
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo')
        .send(slo);

      return body;
    },

    async delete(sloId: string) {
      const response = await supertest
        .delete(`/api/observability/slos/${sloId}`)
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo');
      return response;
    },

    async waitForSloToBeDeleted(sloId: string) {
      if (!sloId) {
        throw new Error(`sloId is undefined`);
      }
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await supertest
          .delete(`/api/observability/slos/${sloId}`)
          .set('kbn-xsrf', 'foo')
          .set('x-elastic-internal-origin', 'foo')
          .timeout(requestTimeout);
        if (!response.ok) {
          throw new Error(`slodId [${sloId}] was not deleted`);
        }
        return response;
      });
    },

    async waitForSloCreated({ sloId }: { sloId: string }) {
      if (!sloId) {
        throw new Error(`'sloId is undefined`);
      }
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await supertest
          .get(`/api/observability/slos/${sloId}`)
          .set('kbn-xsrf', 'foo')
          .set('x-elastic-internal-origin', 'foo')
          .timeout(requestTimeout);
        if (response.body.id === undefined) {
          throw new Error(`No slo with id ${sloId} found`);
        }
        return response.body;
      });
    },

    async waitForSloSummaryTempIndexToExist(index: string) {
      if (!index) {
        throw new Error(`index is undefined`);
      }

      return await retry.tryForTime(retryTimeout, async () => {
        const indexExists = await es.indices.exists({ index, allow_no_indices: false });
        if (!indexExists) {
          throw new Error(`index ${index} should exist`);
        }
        return indexExists;
      });
    },

    async getSloData({ sloId, indexName }: { sloId: string; indexName: string }) {
      const response = await es.search({
        index: indexName,
        body: {
          query: {
            bool: {
              filter: [{ term: { 'slo.id': sloId } }],
            },
          },
        },
      });
      return response;
    },
    async waitForSloData({ sloId, indexName }: { sloId: string; indexName: string }) {
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await es.search({
          index: indexName,
          body: {
            query: {
              bool: {
                filter: [{ term: { 'slo.id': sloId } }],
              },
            },
          },
        });
        if (response.hits.hits.length === 0) {
          throw new Error(`No hits found at index [${indexName}] for slo [${sloId}] `);
        }
        return response;
      });
    },
    async deleteAllSLOs() {
      const response = await supertest
        .get(`/api/observability/slos/_definitions`)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'foo')
        .send()
        .expect(200);
      await Promise.all(
        response.body.results.map(({ id }: { id: string }) => {
          return supertest
            .delete(`/api/observability/slos/${id}`)
            .set('kbn-xsrf', 'true')
            .set('x-elastic-internal-origin', 'foo')
            .send()
            .expect(204);
        })
      );
    },
  };
}
