/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { TIMELINE_PREPACKAGED_URL } from '@kbn/security-solution-plugin/common/constants';
import TestAgent from 'supertest/lib/agent';
import { FtrProviderContextWithSpaces } from '../../../../ftr_provider_context_with_spaces';
import { deleteTimelines } from '../../utils/timelines';

export default ({ getService }: FtrProviderContextWithSpaces): void => {
  const utils = getService('securitySolutionUtils');
  let supertest: TestAgent;

  describe('install_prepackaged_timelines', () => {
    before(async () => {
      supertest = await utils.createSuperTest();
    });

    describe('creating prepackaged rules', () => {
      afterEach(async () => {
        await deleteTimelines(supertest);
      });

      it('should contain timelines_installed, and timelines_updated', async () => {
        const { body } = await supertest
          .post(TIMELINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(Object.keys(body)).to.eql([
          'success',
          'success_count',
          'timelines_installed',
          'timelines_updated',
          'errors',
        ]);
        expect(body).to.eql({
          success: true,
          success_count: 10,
          errors: [],
          timelines_installed: 10,
          timelines_updated: 0,
        });
      });

      it('should create the prepackaged timelines and return a count greater than zero', async () => {
        const { body } = await supertest
          .post(TIMELINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.timelines_installed).to.be.greaterThan(0);
      });

      it('should create the prepackaged timelines and the timelines_updated is of size zero', async () => {
        const { body } = await supertest
          .post(TIMELINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.timelines_updated).to.eql(0);
      });

      it('should be possible to call the API twice and the second time the number of timelines installed should be zero', async () => {
        await supertest.post(TIMELINE_PREPACKAGED_URL).set('kbn-xsrf', 'true').send().expect(200);

        const { body: timelinePrepackagedResponseBody } = await supertest
          .post(TIMELINE_PREPACKAGED_URL)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(timelinePrepackagedResponseBody.timelines_installed).to.eql(0);
      });
    });
  });
};
