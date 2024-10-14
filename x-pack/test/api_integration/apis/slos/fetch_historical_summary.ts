/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  SLO_DESTINATION_INDEX_NAME,
  SLO_DESTINATION_INDEX_PATTERN,
} from '@kbn/slo-plugin/common/constants';
import { ALL_VALUE } from '@kbn/slo-schema';
import moment from 'moment';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const sloApi = getService('slo');

  const SLO_ID = 'slo-fake-1';

  describe('fetch historical summary', () => {
    before(async () => {
      await sloApi.createUser();
      const now = moment().startOf('minute');
      const curr = now.clone().subtract(30, 'days');
      const end = now.clone().add(5, 'minutes');

      const batchOperations = [];
      while (curr.isSameOrBefore(end)) {
        batchOperations.push([
          { index: { _index: SLO_DESTINATION_INDEX_NAME } },
          {
            '@timestamp': curr.toISOString(),
            slo: {
              id: SLO_ID,
              revision: 1,
              instanceId: ALL_VALUE,
              numerator: 90,
              denominator: 100,
              isGoodSlice: 1,
              groupings: {},
            },
          },
        ]);
        curr.add(1, 'minute');
      }

      await esClient.bulk({
        index: SLO_DESTINATION_INDEX_NAME,
        operations: batchOperations.flat(),
        refresh: 'wait_for',
      });

      await esClient.indices.refresh({ index: SLO_DESTINATION_INDEX_NAME });
    });

    after(async () => {
      await esDeleteAllIndices(SLO_DESTINATION_INDEX_PATTERN);
    });

    it('computes the historical summary for a rolling occurrences SLO', async () => {
      const response = await sloApi.fetchHistoricalSummary({
        list: [
          {
            sloId: SLO_ID,
            instanceId: ALL_VALUE,
            timeWindow: {
              duration: '7d',
              type: 'rolling',
            },
            budgetingMethod: 'occurrences',
            objective: {
              target: 0.9,
            },
            groupBy: ALL_VALUE,
            revision: 1,
          },
        ],
      });
      expect(response[0].sloId).to.eql(SLO_ID);
      expect(response[0].instanceId).to.eql(ALL_VALUE);
      const numberOfBuckets = response[0].data.length;
      expect(numberOfBuckets).to.be.within(168, 170); // 7 days * 24 hours/day * 1 bucket/hour + 2 extra bucket due to histogram agg rounding
      const last = response[0].data.pop();
      expect(last?.errorBudget).to.eql({
        consumed: 1,
        initial: 0.1,
        isEstimated: false,
        remaining: 0,
      });
      expect(last?.sliValue).to.eql(0.9);
      expect(last?.status).to.eql('HEALTHY');
    });

    it('computes the historical summary for a rolling timeslices SLO', async () => {
      const response = await sloApi.fetchHistoricalSummary({
        list: [
          {
            sloId: SLO_ID,
            instanceId: ALL_VALUE,
            timeWindow: {
              duration: '7d',
              type: 'rolling',
            },
            budgetingMethod: 'timeslices',
            objective: {
              target: 0.9,
              timesliceTarget: 0.8,
              timesliceWindow: '1m',
            },
            groupBy: ALL_VALUE,
            revision: 1,
          },
        ],
      });
      expect(response[0].sloId).to.eql(SLO_ID);
      expect(response[0].instanceId).to.eql(ALL_VALUE);
      const numberOfBuckets = response[0].data.length;
      expect(numberOfBuckets).to.be.within(168, 170); // 7 days * 24 hours/day * 1 bucket/hour + 2 extra bucket due to histogram agg rounding
      const last = response[0].data.pop();
      expect(last?.errorBudget).to.eql({
        consumed: 0,
        initial: 0.1,
        isEstimated: false,
        remaining: 1,
      });
      expect(last?.sliValue).to.eql(1);
      expect(last?.status).to.eql('HEALTHY');
    });
  });
}
