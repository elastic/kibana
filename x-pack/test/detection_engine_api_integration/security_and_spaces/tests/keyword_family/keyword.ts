/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getEqlRuleForSignalTesting,
  getRuleForSignalTesting,
  getSignalsById,
  getThresholdRuleForSignalTesting,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
} from '../../../utils';
import {
  EqlCreateSchema,
  QueryCreateSchema,
  ThresholdCreateSchema,
} from '../../../../../plugins/security_solution/common/detection_engine/schemas/request';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  interface EventModule {
    module: string;
    dataset: string;
  }

  describe('Rule detects against a keyword of event.dataset', () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest);
      await esArchiver.load('x-pack/test/functional/es_archives/rule_keyword_family/keyword');
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest);
      await deleteAllAlerts(supertest);
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_keyword_family/keyword');
    });

    describe('"kql" rule type', () => {
      it('should detect the "dataset_name_1" from "event.dataset"', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['keyword']),
          query: 'event.dataset: "dataset_name_1"',
        };
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits
          .map((hit) => (hit._source.event as EventModule).dataset)
          .sort();
        expect(hits).to.eql([
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
        ]);
      });
    });

    describe('"eql" rule type', () => {
      it('should detect the "dataset_name_1" from "event.dataset"', async () => {
        const rule: EqlCreateSchema = {
          ...getEqlRuleForSignalTesting(['keyword']),
          query: 'any where event.dataset=="dataset_name_1"',
        };

        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits
          .map((hit) => (hit._source.event as EventModule).dataset)
          .sort();
        expect(hits).to.eql([
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
        ]);
      });
    });

    describe('"threshold" rule type', async () => {
      it('should detect the "dataset_name_1" from "event.dataset"', async () => {
        const rule: ThresholdCreateSchema = {
          ...getThresholdRuleForSignalTesting(['keyword']),
          threshold: {
            field: 'event.dataset',
            value: 1,
          },
        };
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, id);
        const hits = signalsOpen.hits.hits
          .map((hit) => hit._source.signal.threshold_result ?? null)
          .sort();
        expect(hits).to.eql([
          {
            count: 4,
            from: '1900-01-01T00:00:00.000Z',
            terms: [
              {
                field: 'event.dataset',
                value: 'dataset_name_1',
              },
            ],
          },
        ]);
      });
    });
  });
};
