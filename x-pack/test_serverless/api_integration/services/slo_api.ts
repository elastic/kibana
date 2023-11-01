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
  id: string;
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
  const supertest = getService('supertest');
  const retry = getService('retry');
  const requestTimeout = 30 * 1000;
  const retryTimeout = 120 * 1000;

  return {
    async create(slo: SloParams) {
      const { body } = await supertest
        .post(`/api/observability/slos`)
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo')
        .send(slo);

      return body;
    },

    async delete() {},

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

        return response.body;
      });
    },
  };
}
