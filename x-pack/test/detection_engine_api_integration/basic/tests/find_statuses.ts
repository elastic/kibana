/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  deleteAllRulesStatuses,
  getSimpleRule,
  createRule,
  waitForRuleSuccessOrStatus,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('find_statuses', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
    });

    beforeEach(async () => {
      await createSignalsIndex(supertest);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest);
      await deleteAllAlerts(supertest);
      await deleteAllRulesStatuses(es);
    });

    it('should return an empty find statuses body correctly if no statuses are loaded', async () => {
      const { body } = await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/_find_statuses`)
        .set('kbn-xsrf', 'true')
        .send({ ids: [] })
        .expect(200);

      expect(body).to.eql({});
    });

    it('should return a single rule status when a single rule is loaded from a find status with defaults added', async () => {
      const resBody = await createRule(supertest, getSimpleRule('rule-1', true));

      await waitForRuleSuccessOrStatus(supertest, resBody.id);

      // query the single rule from _find
      const { body } = await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/_find_statuses`)
        .set('kbn-xsrf', 'true')
        .send({ ids: [resBody.id] })
        .expect(200);

      // expected result for status should be 'going to run' or 'succeeded
      expect(['succeeded', 'going to run']).to.contain(body[resBody.id].current_status.status);
    });
  });
};
