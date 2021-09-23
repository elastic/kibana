/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_URL,
} from '../../../../plugins/security_solution/common/constants';
import { BulkAction } from '../../../../plugins/security_solution/common/detection_engine/schemas/common/schemas';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  binaryToString,
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  getSimpleRuleOutput,
  removeServerGeneratedProperties,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');

  describe('perform_bulk_action', () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest);
      await deleteAllAlerts(supertest);
    });

    it('should export rules', async () => {
      await createRule(supertest, getSimpleRule());

      const { body } = await supertest
        .post(DETECTION_ENGINE_RULES_BULK_ACTION)
        .set('kbn-xsrf', 'true')
        .send({ query: '', action: BulkAction.export })
        .expect(200)
        .expect('Content-Type', 'application/ndjson')
        .expect('Content-Disposition', 'attachment; filename="rules_export.ndjson"')
        .parse(binaryToString);

      const [ruleJson, exportDetailsJson] = body.toString().split(/\n/);

      const rule = removeServerGeneratedProperties(JSON.parse(ruleJson));
      expect(rule).to.eql(getSimpleRuleOutput());

      const exportDetails = JSON.parse(exportDetailsJson);
      expect(exportDetails).to.eql({
        exported_count: 1,
        missing_rules: [],
        missing_rules_count: 0,
      });
    });

    it('should delete rules', async () => {
      const ruleId = 'ruleId';
      await createRule(supertest, getSimpleRule(ruleId));

      const { body } = await supertest
        .post(DETECTION_ENGINE_RULES_BULK_ACTION)
        .set('kbn-xsrf', 'true')
        .send({ query: '', action: BulkAction.delete })
        .expect(200);

      expect(body).to.eql({ success: true, rules_count: 1 });

      await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=${ruleId}`)
        .set('kbn-xsrf', 'true')
        .expect(404);
    });

    it('should enable rules', async () => {
      const ruleId = 'ruleId';
      await createRule(supertest, getSimpleRule(ruleId));

      const { body } = await supertest
        .post(DETECTION_ENGINE_RULES_BULK_ACTION)
        .set('kbn-xsrf', 'true')
        .send({ query: '', action: BulkAction.enable })
        .expect(200);

      expect(body).to.eql({ success: true, rules_count: 1 });

      const { body: ruleBody } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=${ruleId}`)
        .set('kbn-xsrf', 'true')
        .expect(200);

      const referenceRule = getSimpleRuleOutput(ruleId);
      referenceRule.enabled = true;

      const storedRule = removeServerGeneratedProperties(ruleBody);

      expect(storedRule).to.eql(referenceRule);
    });

    it('should disable rules', async () => {
      const ruleId = 'ruleId';
      await createRule(supertest, getSimpleRule(ruleId, true));

      const { body } = await supertest
        .post(DETECTION_ENGINE_RULES_BULK_ACTION)
        .set('kbn-xsrf', 'true')
        .send({ query: '', action: BulkAction.disable })
        .expect(200);

      expect(body).to.eql({ success: true, rules_count: 1 });

      const { body: ruleBody } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=${ruleId}`)
        .set('kbn-xsrf', 'true')
        .expect(200);

      const referenceRule = getSimpleRuleOutput(ruleId);
      const storedRule = removeServerGeneratedProperties(ruleBody);

      expect(storedRule).to.eql(referenceRule);
    });

    it('should duplicate rules', async () => {
      const ruleId = 'ruleId';
      await createRule(supertest, getSimpleRule(ruleId));

      const { body } = await supertest
        .post(DETECTION_ENGINE_RULES_BULK_ACTION)
        .set('kbn-xsrf', 'true')
        .send({ query: '', action: BulkAction.duplicate })
        .expect(200);

      expect(body).to.eql({ success: true, rules_count: 1 });

      const { body: rulesResponse } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(rulesResponse.total).to.eql(2);
    });
  });
};
