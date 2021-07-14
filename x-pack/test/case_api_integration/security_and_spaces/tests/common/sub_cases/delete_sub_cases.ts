/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import {
  CASES_URL,
  SUB_CASES_PATCH_DEL_URL,
} from '../../../../../../plugins/cases/common/constants';
import { postCommentUserReq } from '../../../../common/lib/mock';
import {
  createCaseAction,
  createSubCase,
  deleteAllCaseItems,
  deleteCaseAction,
} from '../../../../common/lib/utils';
import { getSubCaseDetailsUrl } from '../../../../../../plugins/cases/common/api/helpers';
import { CaseResponse } from '../../../../../../plugins/cases/common/api';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  // ENABLE_CASE_CONNECTOR: remove this outer describe once the case connector feature is completed
  describe('delete_sub_cases disabled routes', () => {
    it('should return a 404 when attempting to access the route and the case connector feature is disabled', async () => {
      await supertest
        .delete(`${SUB_CASES_PATCH_DEL_URL}?ids=["sub-case-id"]`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(404);
    });

    // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
    describe.skip('delete_sub_cases', () => {
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

      it('should delete a sub case', async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
        expect(caseInfo.subCases![0].id).to.not.eql(undefined);

        const { body: subCase } = await supertest
          .get(getSubCaseDetailsUrl(caseInfo.id, caseInfo.subCases![0].id))
          .send()
          .expect(200);

        expect(subCase.id).to.not.eql(undefined);

        const { body } = await supertest
          .delete(`${SUB_CASES_PATCH_DEL_URL}?ids=["${subCase.id}"]`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(204);

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

        await supertest
          .delete(`${SUB_CASES_PATCH_DEL_URL}?ids=["${patchedCaseWithSubCase.subCases![0].id}"]`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(204);

        await supertest.get(subCaseCommentUrl).set('kbn-xsrf', 'true').send().expect(404);
      });

      it('unhappy path - 404s when sub case id is invalid', async () => {
        await supertest
          .delete(`${SUB_CASES_PATCH_DEL_URL}?ids=["fake-id"]`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(404);
      });
    });
  });
}
