/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../plugins/case/common/constants';
import { postCaseReq, postCommentUserReq } from '../../../common/lib/mock';
import {
  createCaseAction,
  createSubCase,
  deleteAllCaseItems,
  deleteCaseAction,
  deleteCases,
  deleteCasesUserActions,
  deleteComments,
} from '../../../common/lib/utils';
import { getSubCaseDetailsUrl } from '../../../../../plugins/case/common/api/helpers';
import { CollectionWithSubCaseResponse } from '../../../../../plugins/case/common/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('delete_cases', () => {
    afterEach(async () => {
      await deleteCases(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    it('should delete a case', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body } = await supertest
        .delete(`${CASES_URL}?ids=["${postedCase.id}"]`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(204);

      expect(body).to.eql({});
    });

    it(`should delete a case's comments when that case gets deleted`, async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body: patchedCase } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
        .expect(200);

      await supertest
        .get(`${CASES_URL}/${postedCase.id}/comments/${patchedCase.comments[0].id}`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      await supertest
        .delete(`${CASES_URL}?ids=["${postedCase.id}"]`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(204);

      await supertest
        .get(`${CASES_URL}/${postedCase.id}/comments/${patchedCase.comments[0].id}`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(404);
    });

    it('unhappy path - 404s when case is not there', async () => {
      await supertest
        .delete(`${CASES_URL}?ids=["fake-id"]`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(404);
    });

    describe('sub cases', () => {
      let actionID: string;
      before(async () => {
        actionID = await createCaseAction(supertest);
      });
      after(async () => {
        await deleteCaseAction(supertest, actionID);
      });
      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      it('should delete the sub cases when deleting a collection', async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
        expect(caseInfo.subCase?.id).to.not.eql(undefined);

        const { body } = await supertest
          .delete(`${CASES_URL}?ids=["${caseInfo.id}"]`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(204);

        expect(body).to.eql({});
        await supertest
          .get(getSubCaseDetailsUrl(caseInfo.id, caseInfo.subCase!.id))
          .send()
          .expect(404);
      });

      it(`should delete a sub case's comments when that case gets deleted`, async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
        expect(caseInfo.subCase?.id).to.not.eql(undefined);

        // there should be two comments on the sub case now
        const {
          body: patchedCaseWithSubCase,
        }: { body: CollectionWithSubCaseResponse } = await supertest
          .post(`${CASES_URL}/${caseInfo.id}/comments`)
          .set('kbn-xsrf', 'true')
          .query({ subCaseID: caseInfo.subCase!.id })
          .send(postCommentUserReq)
          .expect(200);

        const subCaseCommentUrl = `${CASES_URL}/${patchedCaseWithSubCase.id}/comments/${
          patchedCaseWithSubCase.subCase!.comments![1].id
        }`;
        // make sure we can get the second comment
        await supertest.get(subCaseCommentUrl).set('kbn-xsrf', 'true').send().expect(200);

        await supertest
          .delete(`${CASES_URL}?ids=["${caseInfo.id}"]`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(204);

        await supertest.get(subCaseCommentUrl).set('kbn-xsrf', 'true').send().expect(404);
      });
    });
  });
};
