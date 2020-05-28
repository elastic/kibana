/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CASES_URL, CASE_STATUS_URL } from '../../../../../../plugins/case/common/constants';
import { postCaseReq } from '../../../../common/lib/mock';
import { deleteCases } from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_status', () => {
    afterEach(async () => {
      await deleteCases(es);
    });

    it('should return case statuses', async () => {
      await supertest.post(CASES_URL).set('kbn-xsrf', 'true').send(postCaseReq);
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq);
      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              status: 'closed',
            },
          ],
        })
        .expect(200);

      const { body } = await supertest
        .get(CASE_STATUS_URL)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body).to.eql({
        count_open_cases: 1,
        count_closed_cases: 1,
      });
    });
  });
};
