/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '../../../../legacy/plugins/siem/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  binaryToString,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  getSimpleRuleOutput,
  removeServerGeneratedProperties,
} from './utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('legacyEs');

  describe('export_rules', () => {
    describe('exporting rules', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(es);
      });

      it('should set the response content types to be expected', async () => {
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .send()
          .query()
          .expect(200)
          .expect('Content-Type', 'application/ndjson')
          .expect('Content-Disposition', 'attachment; filename="export.ndjson"');
      });

      it('should export a single rule with a rule_id', async () => {
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .send()
          .query()
          .expect(200)
          .parse(binaryToString);

        const bodySplitAndParsed = JSON.parse(body.toString().split(/\n/)[0]);
        const bodyToTest = removeServerGeneratedProperties(bodySplitAndParsed);

        expect(bodyToTest).to.eql(getSimpleRuleOutput());
      });

      it('should export a exported count with a single rule_id', async () => {
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .send()
          .query()
          .expect(200)
          .parse(binaryToString);

        const bodySplitAndParsed = JSON.parse(body.toString().split(/\n/)[1]);

        expect(bodySplitAndParsed).to.eql({
          exported_count: 1,
          missing_rules: [],
          missing_rules_count: 0,
        });
      });

      it('should export exactly two rules given two rules', async () => {
        // post rule 1
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule('rule-1'))
          .expect(200);

        // post rule 2
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule('rule-2'))
          .expect(200);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .send()
          .query()
          .expect(200)
          .parse(binaryToString);

        const firstRuleParsed = JSON.parse(body.toString().split(/\n/)[0]);
        const secondRuleParsed = JSON.parse(body.toString().split(/\n/)[1]);
        const firstRule = removeServerGeneratedProperties(firstRuleParsed);
        const secondRule = removeServerGeneratedProperties(secondRuleParsed);

        expect([firstRule, secondRule]).to.eql([
          getSimpleRuleOutput('rule-2'),
          getSimpleRuleOutput('rule-1'),
        ]);
      });
    });
  });
};
