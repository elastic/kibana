/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_PREPACKAGED_URL } from '../../../../legacy/plugins/siem/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createSignalsIndex, deleteAllAlerts, deleteSignalsIndex } from './utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('legacyEs');

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
            'Pre-packaged rules cannot be installed until the space index is created: .siem-signals-default',
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
      });

      it('should contain two output keys of rules_installed and rules_updated', async () => {
        const { body } = await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(Object.keys(body)).to.eql(['rules_installed', 'rules_updated']);
      });

      it('should create the prepackaged rules and return a count greater than zero', async () => {
        const { body } = await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.rules_installed).to.be.greaterThan(0);
      });

      it('should create the prepackaged rules that the rules_updated is of size zero', async () => {
        const { body } = await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.rules_updated).to.eql(0);
      });

      it('should be possible to call the API twice and the second time the number of rules installed should be zero', async () => {
        await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        const { body } = await supertest
          .put(DETECTION_ENGINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.rules_installed).to.eql(0);
      });
    });
  });
};
