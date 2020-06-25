/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getComplexRule,
  getComplexRuleOutput,
  getSimpleRule,
  getSimpleRuleOutput,
  removeServerGeneratedProperties,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('find_rules', () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest);
      await deleteAllAlerts(es);
    });

    it('should return an empty find body correctly if no rules are loaded', async () => {
      const { body } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body).to.eql({
        data: [],
        page: 1,
        perPage: 20,
        total: 0,
      });
    });

    it('should return a single rule when a single rule is loaded from a find with defaults added', async () => {
      // add a single rule
      await supertest
        .post(DETECTION_ENGINE_RULES_URL)
        .set('kbn-xsrf', 'true')
        .send(getSimpleRule())
        .expect(200);

      // query the single rule from _find
      const { body } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      body.data = [removeServerGeneratedProperties(body.data[0])];
      expect(body).to.eql({
        data: [getSimpleRuleOutput()],
        page: 1,
        perPage: 20,
        total: 1,
      });
    });

    it('should return a single rule when a single rule is loaded from a find with everything for the rule added', async () => {
      // add a single rule
      await supertest
        .post(DETECTION_ENGINE_RULES_URL)
        .set('kbn-xsrf', 'true')
        .send(getComplexRule())
        .expect(200);

      // query and expect that we get back one record in the find
      const { body } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      body.data = [removeServerGeneratedProperties(body.data[0])];
      expect(body).to.eql({
        data: [getComplexRuleOutput()],
        page: 1,
        perPage: 20,
        total: 1,
      });
    });
  });
};
