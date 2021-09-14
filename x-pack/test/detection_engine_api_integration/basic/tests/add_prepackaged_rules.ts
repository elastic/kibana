/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PrePackagedRulesAndTimelinesSchema } from '../../../../plugins/security_solution/common/detection_engine/schemas/response';

import { DETECTION_ENGINE_PREPACKAGED_URL } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteAllTimelines,
  deleteSignalsIndex,
  installPrePackagedRules,
  waitFor,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('add_prepackaged_rules', () => {
    describe('validation errors', () => {
      it('should give an error that the index must exist first if it does not exist before adding prepackaged rules', async () => {
        const { body } = await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(400);

        expect(body).to.eql({
          message:
            'Pre-packaged rules cannot be installed until the signals index is created: .siem-signals-default',
          status_code: 400,
        });
      });
    });

    describe('creating prepackaged rules', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
        await deleteAllTimelines(es);
      });

      it('should create the prepackaged rules and return a count greater than zero, rules_updated to be zero, and contain the correct keys', async () => {
        let responseBody: unknown;
        await waitFor(async () => {
          const { body, status } = await supertest
            .put(DETECTION_ENGINE_PREPACKAGED_URL)
            .set('kbn-xsrf', 'true')
            .send();
          if (status === 200) {
            responseBody = body;
          }
          return status === 200;
        }, DETECTION_ENGINE_PREPACKAGED_URL);

        const prepackagedRules = responseBody as PrePackagedRulesAndTimelinesSchema;
        expect(prepackagedRules.rules_installed).to.be.greaterThan(0);
        expect(prepackagedRules.rules_updated).to.eql(0);
        expect(Object.keys(prepackagedRules)).to.eql([
          'rules_installed',
          'rules_updated',
          'timelines_installed',
          'timelines_updated',
        ]);
      });

      it('should be possible to call the API twice and the second time the number of rules installed should be zero as well as timeline', async () => {
        await installPrePackagedRules(supertest);

        // NOTE: I call the GET call until eventually it becomes consistent and that the number of rules to install are zero.
        // This is to reduce flakiness where it can for a short period of time try to install the same rule twice.
        await waitFor(async () => {
          const { body } = await supertest
            .get(`${DETECTION_ENGINE_PREPACKAGED_URL}/_status`)
            .set('kbn-xsrf', 'true')
            .expect(200);
          return body.rules_not_installed === 0;
        }, `${DETECTION_ENGINE_PREPACKAGED_URL}/_status`);

        let responseBody: unknown;
        await waitFor(async () => {
          const { body, status } = await supertest
            .put(DETECTION_ENGINE_PREPACKAGED_URL)
            .set('kbn-xsrf', 'true')
            .send();
          if (status === 200) {
            responseBody = body;
          }
          return status === 200;
        }, DETECTION_ENGINE_PREPACKAGED_URL);

        const prepackagedRules = responseBody as PrePackagedRulesAndTimelinesSchema;
        expect(prepackagedRules.rules_installed).to.eql(0);
        expect(prepackagedRules.timelines_installed).to.eql(0);
      });
    });
  });
};
