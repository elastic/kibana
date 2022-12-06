/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { RULE_MANAGEMENT_FILTERS_URL } from '@kbn/security-solution-plugin/common/detection_engine/rule_management/api/urls';
import { PREBUILT_RULES_URL } from '@kbn/security-solution-plugin/common/detection_engine/prebuilt_rules';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { deleteAllAlerts, getSimpleRule } from '../../utils';
import { createPrebuiltRuleAssetSavedObjects } from '../../utils/create_prebuilt_rule_saved_objects';
import { deleteAllPrebuiltRules } from '../../utils/delete_all_prebuilt_rules';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');

  describe('get_rule_management_filters', () => {
    beforeEach(async () => {
      await deleteAllAlerts(supertest, log);
    });

    it('should return the correct result when there are no rules', async () => {
      const { body } = await supertest
        .get(RULE_MANAGEMENT_FILTERS_URL)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body).to.eql({
        rules_summary: {
          custom_count: 0,
          prebuilt_installed_count: 0,
        },
        aggregated_fields: {
          tags: [],
        },
      });
    });

    describe('when there is a custom rule', () => {
      beforeEach(async () => {
        const rule = getSimpleRule();
        rule.tags = ['tag-a'];

        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(rule)
          .expect(200);
      });

      it('should return the correct number of custom rules', async () => {
        const { body } = await supertest
          .get(RULE_MANAGEMENT_FILTERS_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.rules_summary.custom_count).to.eql(1);
        expect(body.rules_summary.prebuilt_installed_count).to.eql(0);
      });

      it('should return correct tags', async () => {
        const { body } = await supertest
          .get(RULE_MANAGEMENT_FILTERS_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.aggregated_fields.tags).to.eql(['tag-a']);
      });
    });

    describe('when there are installed prebuilt rules', () => {
      beforeEach(async () => {
        await createPrebuiltRuleAssetSavedObjects(es);
        await supertest.put(PREBUILT_RULES_URL).set('kbn-xsrf', 'true').send().expect(200);
      });

      afterEach(async () => {
        await deleteAllPrebuiltRules(es);
      });

      it('should return the correct number of installed prepacked rules after pre-packaged rules have been installed', async () => {
        const { body } = await supertest
          .get(RULE_MANAGEMENT_FILTERS_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.rules_summary.prebuilt_installed_count).to.eql(3);
        expect(body.rules_summary.custom_count).to.eql(0);
      });

      it('should return installed prebuilt rules tags', async () => {
        const { body } = await supertest
          .get(RULE_MANAGEMENT_FILTERS_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.aggregated_fields.tags).to.eql(['test-tag-1', 'test-tag-2', 'test-tag-3']);
      });
    });
  });
};
