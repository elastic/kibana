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
  deleteAllRulesStatuses,
  getSimpleRule,
  waitFor,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('find_statuses', () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest);
      await deleteAllAlerts(es);
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

    /*
       This test is to ensure no future regressions introduced by the following scenario
       a call to updateApiKey was invalidating the api key used by the
       rule while the rule was executing, or even before it executed,
       on the first rule run.
       this pr https://github.com/elastic/kibana/pull/68184
       fixed this by finding the true source of a bug that required the manual
       api key update, and removed the call to that function.

       When the api key is updated before / while the rule is executing, the alert
       executor no longer has access to a service to update the rule status
       saved object in Elasticsearch. Because of this, we cannot set the rule into
       a 'failure' state, so the user ends up seeing 'going to run' as that is the
       last status set for the rule before it erupts in an error that cannot be
       recorded inside of the executor.

       This adds an e2e test for the backend to catch that in case
       this pops up again elsewhere.
      */
    it('should return a single rule status when a single rule is loaded from a find status with defaults added', async () => {
      // add a single rule
      const { body: resBody } = await supertest
        .post(DETECTION_ENGINE_RULES_URL)
        .set('kbn-xsrf', 'true')
        .send(getSimpleRule())
        .expect(200);

      // wait for Task Manager to execute the rule and update status
      await waitFor(async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_find_statuses`)
          .set('kbn-xsrf', 'true')
          .send({ ids: [resBody.id] })
          .expect(200);
        return body[resBody.id].current_status?.status === 'succeeded';
      });

      // query the single rule from _find
      const { body } = await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/_find_statuses`)
        .set('kbn-xsrf', 'true')
        .send({ ids: [resBody.id] })
        .expect(200);

      // expected result for status should be 'going to run' or 'succeeded
      expect(body[resBody.id].current_status.status).to.eql('succeeded');
    });
  });
};
