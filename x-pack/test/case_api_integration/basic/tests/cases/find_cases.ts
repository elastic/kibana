/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../plugins/case/common/constants';
import { postCaseReq, postCommentReq, findCasesResp } from '../../../common/lib/mock';
import { deleteCases, deleteComments, deleteCasesUserActions } from '../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  describe('find_cases', () => {
    afterEach(async () => {
      await deleteCases(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });
    it('should return empty response', async () => {
      const { body } = await supertest
        .get(`${CASES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body).to.eql(findCasesResp);
    });

    it('should return cases', async () => {
      const { body: a } = await supertest.post(CASES_URL).set('kbn-xsrf', 'true').send(postCaseReq);
      const { body: b } = await supertest.post(CASES_URL).set('kbn-xsrf', 'true').send(postCaseReq);
      const { body: c } = await supertest.post(CASES_URL).set('kbn-xsrf', 'true').send(postCaseReq);
      const { body } = await supertest
        .get(`${CASES_URL}/_find?sortOrder=asc`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body).to.eql({
        ...findCasesResp,
        total: 3,
        cases: [a, b, c],
        count_open_cases: 3,
      });
    });

    it('filters by tags', async () => {
      await supertest.post(CASES_URL).set('kbn-xsrf', 'true').send(postCaseReq);
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({ ...postCaseReq, tags: ['unique'] });
      const { body } = await supertest
        .get(`${CASES_URL}/_find?sortOrder=asc&tags=unique`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body).to.eql({
        ...findCasesResp,
        total: 1,
        cases: [postedCase],
        count_open_cases: 1,
      });
    });

    it('correctly counts comments', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq);

      // post 2 comments
      await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentReq);
      const { body: patchedCase } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentReq);
      const { body } = await supertest
        .get(`${CASES_URL}/_find?sortOrder=asc`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body).to.eql({
        ...findCasesResp,
        total: 1,
        cases: [
          {
            ...patchedCase,
            comments: [],
            totalComment: 2,
          },
        ],
        count_open_cases: 1,
      });
    });

    it('correctly counts open/closed', async () => {
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
        .get(`${CASES_URL}/_find?sortOrder=asc`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body.count_open_cases).to.eql(1);
      expect(body.count_closed_cases).to.eql(1);
    });
    it('unhappy path - 400s when bad query supplied', async () => {
      await supertest
        .get(`${CASES_URL}/_find?perPage=true`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(400);
    });
  });
};
