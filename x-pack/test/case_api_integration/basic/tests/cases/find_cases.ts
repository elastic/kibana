/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

import { CASES_URL, SUB_CASES_PATCH_DEL_URL } from '../../../../../plugins/cases/common/constants';
import { postCaseReq, postCommentUserReq, findCasesResp } from '../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createSubCase,
  setStatus,
  CreateSubCaseResp,
  createCaseAction,
  deleteCaseAction,
} from '../../../common/lib/utils';
import { CasesFindResponse, CaseStatuses, CaseType } from '../../../../../plugins/cases/common/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  describe('find_cases', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
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
      const { body: a } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body: b } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body: c } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

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
        .send({ ...postCaseReq, tags: ['unique'] })
        .expect(200);

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

    it('filters by status', async () => {
      const { body: openCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq);

      const { body: toCloseCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq);

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: toCloseCase.id,
              version: toCloseCase.version,
              status: 'closed',
            },
          ],
        })
        .expect(200);

      const { body } = await supertest
        .get(`${CASES_URL}/_find?sortOrder=asc&status=open`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body).to.eql({
        ...findCasesResp,
        total: 1,
        cases: [openCase],
        count_open_cases: 1,
        count_closed_cases: 1,
        count_in_progress_cases: 0,
      });
    });

    it('filters by reporters', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq);

      const { body } = await supertest
        .get(`${CASES_URL}/_find?sortOrder=asc&reporters=elastic`)
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
        .send(postCaseReq)
        .expect(200);

      // post 2 comments
      await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
        .expect(200);

      const { body: patchedCase } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
        .expect(200);

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

    it('correctly counts open/closed/in-progress', async () => {
      await supertest.post(CASES_URL).set('kbn-xsrf', 'true').send(postCaseReq);

      const { body: inProgreeCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq);

      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

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

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: inProgreeCase.id,
              version: inProgreeCase.version,
              status: 'in-progress',
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
      expect(body.count_in_progress_cases).to.eql(1);
    });

    describe('stats with sub cases', () => {
      let collection: CreateSubCaseResp;
      let actionID: string;
      before(async () => {
        actionID = await createCaseAction(supertest);
      });
      after(async () => {
        await deleteCaseAction(supertest, actionID);
      });
      beforeEach(async () => {
        collection = await createSubCase({ supertest, actionID });

        const [, , { body: toCloseCase }] = await Promise.all([
          setStatus({
            supertest,
            cases: [
              {
                id: collection.newSubCaseInfo.subCases![0].id,
                version: collection.newSubCaseInfo.subCases![0].version,
                status: CaseStatuses['in-progress'],
              },
            ],
            type: 'sub_case',
          }),
          supertest.post(CASES_URL).set('kbn-xsrf', 'true').send(postCaseReq),
          supertest.post(CASES_URL).set('kbn-xsrf', 'true').send(postCaseReq),
        ]);

        await setStatus({
          supertest,
          cases: [
            {
              id: toCloseCase.id,
              version: toCloseCase.version,
              status: CaseStatuses.closed,
            },
          ],
          type: 'case',
        });
      });
      it('correctly counts stats without using a filter', async () => {
        const { body }: { body: CasesFindResponse } = await supertest
          .get(`${CASES_URL}/_find?sortOrder=asc`)
          .expect(200);

        expect(body.total).to.eql(3);
        expect(body.count_closed_cases).to.eql(1);
        expect(body.count_open_cases).to.eql(1);
        expect(body.count_in_progress_cases).to.eql(1);
      });

      it('correctly counts stats with a filter for open cases', async () => {
        const { body }: { body: CasesFindResponse } = await supertest
          .get(`${CASES_URL}/_find?sortOrder=asc&status=open`)
          .expect(200);

        // since we're filtering on status and the collection only has an in-progress case, it should only return the
        // individual case that has the open status and no collections
        expect(body.total).to.eql(1);
        expect(body.count_closed_cases).to.eql(1);
        expect(body.count_open_cases).to.eql(1);
        expect(body.count_in_progress_cases).to.eql(1);
      });

      it('correctly counts stats with a filter for individual cases', async () => {
        const { body }: { body: CasesFindResponse } = await supertest
          .get(`${CASES_URL}/_find?sortOrder=asc&type=${CaseType.individual}`)
          .expect(200);

        expect(body.total).to.eql(2);
        expect(body.count_closed_cases).to.eql(1);
        expect(body.count_open_cases).to.eql(1);
        expect(body.count_in_progress_cases).to.eql(0);
      });

      it('correctly counts stats with a filter for collection cases with multiple sub cases', async () => {
        // this will force the first sub case attached to the collection to be closed
        // so we'll have one closed sub case and one open sub case
        await createSubCase({ supertest, caseID: collection.newSubCaseInfo.id, actionID });
        const { body }: { body: CasesFindResponse } = await supertest
          .get(`${CASES_URL}/_find?sortOrder=asc&type=${CaseType.collection}`)
          .expect(200);

        expect(body.total).to.eql(1);
        expect(body.cases[0].subCases?.length).to.eql(2);
        expect(body.count_closed_cases).to.eql(1);
        expect(body.count_open_cases).to.eql(1);
        expect(body.count_in_progress_cases).to.eql(0);
      });

      it('correctly counts stats with a filter for collection and open cases with multiple sub cases', async () => {
        // this will force the first sub case attached to the collection to be closed
        // so we'll have one closed sub case and one open sub case
        await createSubCase({ supertest, caseID: collection.newSubCaseInfo.id, actionID });
        const { body }: { body: CasesFindResponse } = await supertest
          .get(
            `${CASES_URL}/_find?sortOrder=asc&type=${CaseType.collection}&status=${CaseStatuses.open}`
          )
          .expect(200);

        expect(body.total).to.eql(1);
        expect(body.cases[0].subCases?.length).to.eql(1);
        expect(body.count_closed_cases).to.eql(1);
        expect(body.count_open_cases).to.eql(1);
        expect(body.count_in_progress_cases).to.eql(0);
      });

      it('correctly counts stats including a collection without sub cases when not filtering on status', async () => {
        // delete the sub case on the collection so that it doesn't have any sub cases
        await supertest
          .delete(`${SUB_CASES_PATCH_DEL_URL}?ids=["${collection.newSubCaseInfo.subCases![0].id}"]`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(204);

        const { body }: { body: CasesFindResponse } = await supertest
          .get(`${CASES_URL}/_find?sortOrder=asc`)
          .expect(200);

        // it should include the collection without sub cases because we did not pass in a filter on status
        expect(body.total).to.eql(3);
        expect(body.count_closed_cases).to.eql(1);
        expect(body.count_open_cases).to.eql(1);
        expect(body.count_in_progress_cases).to.eql(0);
      });

      it('correctly counts stats including a collection without sub cases when filtering on tags', async () => {
        // delete the sub case on the collection so that it doesn't have any sub cases
        await supertest
          .delete(`${SUB_CASES_PATCH_DEL_URL}?ids=["${collection.newSubCaseInfo.subCases![0].id}"]`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(204);

        const { body }: { body: CasesFindResponse } = await supertest
          .get(`${CASES_URL}/_find?sortOrder=asc&tags=defacement`)
          .expect(200);

        // it should include the collection without sub cases because we did not pass in a filter on status
        expect(body.total).to.eql(3);
        expect(body.count_closed_cases).to.eql(1);
        expect(body.count_open_cases).to.eql(1);
        expect(body.count_in_progress_cases).to.eql(0);
      });

      it('does not return collections without sub cases matching the requested status', async () => {
        const { body }: { body: CasesFindResponse } = await supertest
          .get(`${CASES_URL}/_find?sortOrder=asc&status=closed`)
          .expect(200);

        // it should not include the collection that has a sub case as in-progress
        expect(body.total).to.eql(1);
        expect(body.count_closed_cases).to.eql(1);
        expect(body.count_open_cases).to.eql(1);
        expect(body.count_in_progress_cases).to.eql(1);
      });

      it('does not return empty collections when filtering on status', async () => {
        // delete the sub case on the collection so that it doesn't have any sub cases
        await supertest
          .delete(`${SUB_CASES_PATCH_DEL_URL}?ids=["${collection.newSubCaseInfo.subCases![0].id}"]`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(204);

        const { body }: { body: CasesFindResponse } = await supertest
          .get(`${CASES_URL}/_find?sortOrder=asc&status=closed`)
          .expect(200);

        // it should not include the collection that has a sub case as in-progress
        expect(body.total).to.eql(1);
        expect(body.count_closed_cases).to.eql(1);
        expect(body.count_open_cases).to.eql(1);
        expect(body.count_in_progress_cases).to.eql(0);
      });
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
