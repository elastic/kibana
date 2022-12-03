/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { PREBUILT_RULES_URL } from '@kbn/security-solution-plugin/common/detection_engine/prebuilt_rules';
import { RULES_INFO_URL } from '@kbn/security-solution-plugin/common/detection_engine/rule_management/api/urls';

import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  deleteAllTimelines,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');

  describe('get_rules_info', () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
      await deleteAllTimelines(es);
    });

    it('should return expected JSON keys', async () => {
      const { body } = await supertest
        .get(RULES_INFO_URL)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(Object.keys(body)).to.eql([
        'rules_custom_count',
        'rules_prebuilt_installed_count',
        'tags',
      ]);
    });

    it('should return the correct result when there are no rules', async () => {
      const { body } = await supertest
        .get(RULES_INFO_URL)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);
      expect(body.rules_custom_count).to.eql(0);
      expect(body.rules_prebuilt_installed_count).to.eql(0);
      expect(body.tags).to.eql([]);
    });

    describe('when there is a custom rule', () => {
      beforeEach(async () => {
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);
      });

      it('should return the correct number of custom rules', async () => {
        const { body } = await supertest
          .get(RULES_INFO_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
        expect(body.rules_custom_count).to.eql(1);
        expect(body.rules_prebuilt_installed_count).to.eql(0);
      });

      it('should return correct tags', async () => {
        const { body } = await supertest
          .get(RULES_INFO_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
        expect(body.tags).to.eql(['tag-a']);
      });
    });

    describe('when there are installed prebuilt rules', () => {
      beforeEach(async () => {
        await supertest.put(PREBUILT_RULES_URL).set('kbn-xsrf', 'true').send().expect(200);
      });

      it('should return the correct number of installed prepacked rules after pre-packaged rules have been installed', async () => {
        const { body } = await supertest
          .get(RULES_INFO_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
        expect(body.rules_prebuilt_installed_count).to.be.greaterThan(0);
        expect(body.rules_custom_count).to.eql(0);
      });

      it('should return correct tags', async () => {
        const { body } = await supertest
          .get(RULES_INFO_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
        expect(body.tags.length).to.be.greaterThan(0);
      });
    });
  });
};
