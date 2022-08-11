/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  EqlCreateSchema,
  QueryCreateSchema,
  ThresholdCreateSchema,
} from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';
import { ALERT_THRESHOLD_RESULT } from '@kbn/security-solution-plugin/common/field_maps/field_names';
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

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');

  describe('Rule detects against a keyword of event.dataset', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_keyword_family/keyword');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_keyword_family/keyword');
    });

    beforeEach(async () => {
      await createSignalsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
    });

    describe('"kql" rule type', () => {
      it('should detect the "dataset_name_1" from "event.dataset"', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['keyword']),
          query: 'event.dataset: "dataset_name_1"',
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.['event.dataset']).sort();
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

        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.['event.dataset']).sort();
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
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits
          .map((hit) => hit._source?.[ALERT_THRESHOLD_RESULT] ?? null)
          .sort();
        expect(hits).to.eql([
          {
            count: 4,
            from: '2020-10-28T05:00:53.000Z',
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
