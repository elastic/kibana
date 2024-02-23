/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { binaryToString, getCustomQueryRuleParams } from '../../../utils';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../common/utils/security_solution';
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('@ess @serverless export_rules', () => {
    describe('exporting rules', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should set the response content types to be expected', async () => {
        await createRule(supertest, log, getCustomQueryRuleParams());

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .expect('Content-Type', 'application/ndjson')
          .expect('Content-Disposition', 'attachment; filename="export.ndjson"');
      });

      it('should export a single rule with a rule_id', async () => {
        const ruleToExport = getCustomQueryRuleParams();

        await createRule(supertest, log, ruleToExport);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .parse(binaryToString);

        const exportedRule = JSON.parse(body.toString().split(/\n/)[0]);

        expect(exportedRule).toMatchObject(ruleToExport);
      });

      it('should have export summary reflecting a number of rules', async () => {
        await createRule(supertest, log, getCustomQueryRuleParams());

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .parse(binaryToString);

        const exportSummary = JSON.parse(body.toString().split(/\n/)[1]);

        expect(exportSummary).toMatchObject({
          exported_exception_list_count: 0,
          exported_exception_list_item_count: 0,
          exported_count: 1,
          exported_rules_count: 1,
        });
      });

      it('should export exactly two rules given two rules', async () => {
        const ruleToExport1 = getCustomQueryRuleParams({ rule_id: 'rule-1' });
        const ruleToExport2 = getCustomQueryRuleParams({ rule_id: 'rule-2' });

        await createRule(supertest, log, ruleToExport1);
        await createRule(supertest, log, ruleToExport2);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .parse(binaryToString);

        const exportedRule1 = JSON.parse(body.toString().split(/\n/)[0]);
        const exportedRule2 = JSON.parse(body.toString().split(/\n/)[1]);

        expect([exportedRule1, exportedRule2]).toEqual(
          expect.arrayContaining([
            expect.objectContaining(ruleToExport1),
            expect.objectContaining(ruleToExport2),
          ])
        );
      });
    });
  });
};
