/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../../plugins/cases/common/constants';
import { getPostCaseRequest, postCommentUserReq } from '../../../../common/lib/mock';
import {
  createCaseAction,
  createSubCase,
  deleteAllCaseItems,
  deleteCaseAction,
  deleteCases,
  deleteCasesUserActions,
  deleteComments,
  createCase,
  sendDeleteCasesRequest,
  createComment,
  getComment,
} from '../../../../common/lib/utils';
import { getSubCaseDetailsUrl } from '../../../../../../plugins/cases/common/api/helpers';
import { CaseResponse } from '../../../../../../plugins/cases/common/api';

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
      const postedCase = await createCase(supertest, getPostCaseRequest());
      const body = await sendDeleteCasesRequest({ supertest, caseIDs: [postedCase.id] });

      expect(body).to.eql({});
    });

    it(`should delete a case's comments when that case gets deleted`, async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      const patchedCase = await createComment(supertest, postedCase.id, postCommentUserReq);
      // ensure that we can get the comment before deleting the case
      await getComment(supertest, postedCase.id, patchedCase.comments![0].id);

      await sendDeleteCasesRequest({ supertest, caseIDs: [postedCase.id] });

      // make sure the comment is now gone
      await getComment(supertest, postedCase.id, patchedCase.comments![0].id, 404);
    });

    it('unhappy path - 404s when case is not there', async () => {
      await sendDeleteCasesRequest({ supertest, caseIDs: ['fake-id'], expectedHttpCode: 404 });
    });

    // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
    describe.skip('sub cases', () => {
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
        expect(caseInfo.subCases![0].id).to.not.eql(undefined);

        const body = await sendDeleteCasesRequest({ supertest, caseIDs: [caseInfo.id] });

        expect(body).to.eql({});
        await supertest
          .get(getSubCaseDetailsUrl(caseInfo.id, caseInfo.subCases![0].id))
          .send()
          .expect(404);
      });

      it(`should delete a sub case's comments when that case gets deleted`, async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
        expect(caseInfo.subCases![0].id).to.not.eql(undefined);

        // there should be two comments on the sub case now
        const { body: patchedCaseWithSubCase }: { body: CaseResponse } = await supertest
          .post(`${CASES_URL}/${caseInfo.id}/comments`)
          .set('kbn-xsrf', 'true')
          .query({ subCaseId: caseInfo.subCases![0].id })
          .send(postCommentUserReq)
          .expect(200);

        const subCaseCommentUrl = `${CASES_URL}/${patchedCaseWithSubCase.id}/comments/${
          patchedCaseWithSubCase.comments![1].id
        }`;
        // make sure we can get the second comment
        await supertest.get(subCaseCommentUrl).set('kbn-xsrf', 'true').send().expect(200);

        await sendDeleteCasesRequest({ supertest, caseIDs: [caseInfo.id] });

        await supertest.get(subCaseCommentUrl).set('kbn-xsrf', 'true').send().expect(404);
      });
    });
  });
};
