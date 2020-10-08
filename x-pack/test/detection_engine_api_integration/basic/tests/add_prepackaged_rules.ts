/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_PREPACKAGED_URL } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteAllTimelines,
  deleteSignalsIndex,
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
        await deleteAllAlerts(es);
        await deleteAllTimelines(es);
      });

      it('should contain rules_installed, rules_updated, timelines_installed, and timelines_updated', async () => {
        const { body } = await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(Object.keys(body)).to.eql([
          'rules_installed',
          'rules_updated',
          'timelines_installed',
          'timelines_updated',
        ]);
      });

      it('should create the prepackaged rules and return a count greater than zero', async () => {
        const { body } = await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.rules_installed).to.be.greaterThan(0);
      });

      it('should create the prepackaged timelines and return a count greater than zero', async () => {
        const { body } = await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.timelines_installed).to.be.greaterThan(0);
      });

      it('should create the prepackaged rules that the rules_updated is of size zero', async () => {
        const { body } = await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.rules_updated).to.eql(0);
      });

      it('should create the prepackaged timelines and the timelines_updated is of size zero', async () => {
        const { body } = await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.timelines_updated).to.eql(0);
      });

      it('should be possible to call the API twice and the second time the number of rules installed should be zero', async () => {
        await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        // NOTE: I call the GET call until eventually it becomes consistent and that the number of rules to install are zero.
        // This is to reduce flakiness where it can for a short period of time try to install the same rule twice.
        await waitFor(async () => {
          const { body } = await supertest
            .get(`${DETECTION_ENGINE_PREPACKAGED_URL}/_status`)
            .set('kbn-xsrf', 'true')
            .expect(200);
          return body.rules_not_installed === 0;
        });

        const { body } = await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.rules_installed).to.eql(0);
      });

      it('should be possible to call the API twice and the second time the number of timelines installed should be zero', async () => {
        await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        await waitFor(async () => {
          const { body } = await supertest
            .get(`${DETECTION_ENGINE_PREPACKAGED_URL}/_status`)
            .set('kbn-xsrf', 'true')
            .expect(200);
          return body.timelines_not_installed === 0;
        });

        const { body } = await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.timelines_installed).to.eql(0);
      });
    });
  });
};
