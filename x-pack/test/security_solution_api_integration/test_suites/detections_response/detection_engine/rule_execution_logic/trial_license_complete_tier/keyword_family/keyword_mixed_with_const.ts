/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  EqlRuleCreateProps,
  ThresholdRuleCreateProps,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { ALERT_THRESHOLD_RESULT } from '@kbn/security-solution-plugin/common/field_maps/field_names';

import { getEqlRuleForAlertTesting } from '../../../../utils';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  getRuleForAlertTesting,
  getAlertsById,
  waitForRuleSuccess,
  waitForAlertsToBePresent,
} from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');

  describe('@ess @serverless @serverlessQA Rule detects against a keyword and constant_keyword of event.dataset', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_keyword_family/const_keyword');
      await esArchiver.load('x-pack/test/functional/es_archives/rule_keyword_family/keyword');
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/rule_keyword_family/const_keyword'
      );
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_keyword_family/keyword');
    });

    beforeEach(async () => {
      await createAlertsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    describe('"kql" rule type', () => {
      it('should detect the "dataset_name_1" from "event.dataset" and have 8 alerts, 4 from each index', async () => {
        const rule = {
          ...getRuleForAlertTesting(['keyword', 'const_keyword']),
          query: 'event.dataset: "dataset_name_1"',
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 8, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        expect(alertsOpen.hits.hits.length).to.eql(8);
      });

      it('should copy the dataset_name_1 from the index into the alert', async () => {
        const rule = {
          ...getRuleForAlertTesting(['keyword', 'const_keyword']),
          query: 'event.dataset: "dataset_name_1"',
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 8, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.['event.dataset']).sort();
        expect(hits).to.eql([
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
        ]);
      });
    });

    describe('"eql" rule type', () => {
      it('should detect the "dataset_name_1" from "event.dataset" and have 8 alerts, 4 from each index', async () => {
        const rule: EqlRuleCreateProps = {
          ...getEqlRuleForAlertTesting(['keyword', 'const_keyword']),
          query: 'any where event.dataset=="dataset_name_1"',
        };

        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 8, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        expect(alertsOpen.hits.hits.length).to.eql(8);
      });

      it('should copy the "dataset_name_1" from "event.dataset"', async () => {
        const rule: EqlRuleCreateProps = {
          ...getEqlRuleForAlertTesting(['keyword', 'const_keyword']),
          query: 'any where event.dataset=="dataset_name_1"',
        };

        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 8, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.['event.dataset']).sort();
        expect(hits).to.eql([
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
        ]);
      });
    });

    describe('"threshold" rule type', () => {
      it('should detect the "dataset_name_1" from "event.dataset"', async () => {
        const rule: ThresholdRuleCreateProps = {
          ...getRuleForAlertTesting(['keyword', 'const_keyword']),
          rule_id: 'threshold-rule',
          type: 'threshold',
          language: 'kuery',
          query: '*:*',
          threshold: {
            field: 'event.dataset',
            value: 1,
          },
          alert_suppression: undefined,
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 1, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits
          .map((hit) => hit._source?.[ALERT_THRESHOLD_RESULT] ?? null)
          .sort();
        expect(hits).to.eql([
          {
            count: 8,
            from: '2020-10-27T05:00:53.000Z',
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
