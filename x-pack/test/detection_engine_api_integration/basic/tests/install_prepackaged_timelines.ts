/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { TIMELINE_PREPACKAGED_URL } from '@kbn/security-solution-plugin/common/constants';
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
  const log = getService('log');

  describe('install_prepackaged_timelines', () => {
    describe('creating prepackaged rules', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
        await deleteAllTimelines(es);
      });

      it('should contain timelines_installed, and timelines_updated', async () => {
        const { body } = await supertest
          .put(TIMELINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(Object.keys(body)).to.eql(['timelines_installed', 'timelines_updated']);
      });

      it('should create the prepackaged timelines and return a count greater than zero', async () => {
        const { body } = await supertest
          .put(TIMELINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.timelines_installed).to.be.greaterThan(0);
      });

      it('should create the prepackaged timelines and the timelines_updated is of size zero', async () => {
        const { body } = await supertest
          .put(TIMELINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.timelines_updated).to.eql(0);
      });

      it('should be possible to call the API twice and the second time the number of timelines installed should be zero', async () => {
        await supertest.put(TIMELINE_PREPACKAGED_URL).set('kbn-xsrf', 'true').send().expect(200);

        await waitFor(
          async () => {
            const { body } = await supertest
              .get(`${TIMELINE_PREPACKAGED_URL}/_status`)
              .set('kbn-xsrf', 'true')
              .expect(200);
            return body.timelines_not_installed === 0;
          },
          `${TIMELINE_PREPACKAGED_URL}/_status`,
          log
        );

        const { body } = await supertest
          .put(TIMELINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.timelines_installed).to.eql(0);
      });
    });
  });
};
