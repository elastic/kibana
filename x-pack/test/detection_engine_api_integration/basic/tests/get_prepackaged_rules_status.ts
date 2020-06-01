/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import {
  DETECTION_ENGINE_PREPACKAGED_URL,
  DETECTION_ENGINE_RULES_URL,
} from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_prepackaged_rules_status', () => {
    describe('getting prepackaged rules status', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(es);
      });

      it('should return expected JSON keys of the pre-packaged rules status', async () => {
        const { body } = await supertest
          .get(`${DETECTION_ENGINE_PREPACKAGED_URL}/_status`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(Object.keys(body)).to.eql([
          'rules_custom_installed',
          'rules_installed',
          'rules_not_installed',
          'rules_not_updated',
        ]);
      });

      it('should return that rules_not_installed are greater than zero', async () => {
        const { body } = await supertest
          .get(`${DETECTION_ENGINE_PREPACKAGED_URL}/_status`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
        expect(body.rules_not_installed).to.be.greaterThan(0);
      });

      it('should return that rules_custom_installed, rules_installed, and rules_not_updated are zero', async () => {
        const { body } = await supertest
          .get(`${DETECTION_ENGINE_PREPACKAGED_URL}/_status`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
        expect(body.rules_custom_installed).to.eql(0);
        expect(body.rules_installed).to.eql(0);
        expect(body.rules_not_updated).to.eql(0);
      });

      it('should show that one custom rule is installed when a custom rule is added', async () => {
        await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(200);

        const { body } = await supertest
          .get(`${DETECTION_ENGINE_PREPACKAGED_URL}/_status`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
        expect(body.rules_custom_installed).to.eql(1);
        expect(body.rules_installed).to.eql(0);
        expect(body.rules_not_updated).to.eql(0);
      });

      it('should show rules are installed when adding pre-packaged rules', async () => {
        await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        const { body } = await supertest
          .get(`${DETECTION_ENGINE_PREPACKAGED_URL}/_status`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
        expect(body.rules_installed).to.be.greaterThan(0);
      });
    });
  });
};
