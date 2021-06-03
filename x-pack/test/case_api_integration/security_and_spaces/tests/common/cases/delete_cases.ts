/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../../plugins/cases/common/constants';
import { defaultUser, getPostCaseRequest, postCommentUserReq } from '../../../../common/lib/mock';
import {
  createCaseAction,
  createSubCase,
  deleteAllCaseItems,
  deleteCaseAction,
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  createCase,
  deleteCases,
  createComment,
  getComment,
  removeServerGeneratedPropertiesFromUserAction,
  getCase,
  superUserSpace1Auth,
  getCaseUserActions,
} from '../../../../common/lib/utils';
import { getSubCaseDetailsUrl } from '../../../../../../plugins/cases/common/api/helpers';
import { CaseResponse } from '../../../../../../plugins/cases/common/api';
import {
  secOnly,
  secOnlyRead,
  globalRead,
  obsOnlyRead,
  obsSecRead,
  noKibanaPrivileges,
  obsOnly,
  superUser,
} from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const es = getService('es');

  describe('delete_cases', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    it('should delete a case', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      const body = await deleteCases({ supertest, caseIDs: [postedCase.id] });

      expect(body).to.eql({});
    });

    it(`should delete a case's comments when that case gets deleted`, async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });
      // ensure that we can get the comment before deleting the case
      await getComment({
        supertest,
        caseId: postedCase.id,
        commentId: patchedCase.comments![0].id,
      });

      await deleteCases({ supertest, caseIDs: [postedCase.id] });

      // make sure the comment is now gone
      await getComment({
        supertest,
        caseId: postedCase.id,
        commentId: patchedCase.comments![0].id,
        expectedHttpCode: 404,
      });
    });

    it('should create a user action when creating a case', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      await deleteCases({ supertest, caseIDs: [postedCase.id] });
      const userActions = await getCaseUserActions({ supertest, caseID: postedCase.id });
      const creationUserAction = removeServerGeneratedPropertiesFromUserAction(userActions[1]);

      expect(creationUserAction).to.eql({
        action_field: [
          'description',
          'status',
          'tags',
          'title',
          'connector',
          'settings',
          'owner',
          'comment',
        ],
        action: 'delete',
        action_by: defaultUser,
        old_value: null,
        new_value: null,
        case_id: `${postedCase.id}`,
        comment_id: null,
        sub_case_id: '',
        owner: 'securitySolutionFixture',
      });
    });

    it('unhappy path - 404s when case is not there', async () => {
      await deleteCases({ supertest, caseIDs: ['fake-id'], expectedHttpCode: 404 });
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

        const body = await deleteCases({ supertest, caseIDs: [caseInfo.id] });

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

        await deleteCases({ supertest, caseIDs: [caseInfo.id] });

        await supertest.get(subCaseCommentUrl).set('kbn-xsrf', 'true').send().expect(404);
      });
    });

    describe('rbac', () => {
      it('User: security solution only - should delete a case', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: secOnly,
            space: 'space1',
          }
        );

        await deleteCases({
          supertest: supertestWithoutAuth,
          caseIDs: [postedCase.id],
          expectedHttpCode: 204,
          auth: { user: secOnly, space: 'space1' },
        });
      });

      it('User: security solution only - should NOT delete a case of different owner', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: secOnly,
            space: 'space1',
          }
        );

        await deleteCases({
          supertest: supertestWithoutAuth,
          caseIDs: [postedCase.id],
          expectedHttpCode: 403,
          auth: { user: obsOnly, space: 'space1' },
        });
      });

      it('should get an error if the user has not permissions to all requested cases', async () => {
        const caseSec = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: secOnly,
            space: 'space1',
          }
        );

        const caseObs = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          {
            user: obsOnly,
            space: 'space1',
          }
        );

        await deleteCases({
          supertest: supertestWithoutAuth,
          caseIDs: [caseSec.id, caseObs.id],
          expectedHttpCode: 403,
          auth: { user: obsOnly, space: 'space1' },
        });

        // Cases should have not been deleted.
        await getCase({
          supertest: supertestWithoutAuth,
          caseId: caseSec.id,
          expectedHttpCode: 200,
          auth: superUserSpace1Auth,
        });

        await getCase({
          supertest: supertestWithoutAuth,
          caseId: caseObs.id,
          expectedHttpCode: 200,
          auth: superUserSpace1Auth,
        });
      });

      for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
        it(`User ${
          user.username
        } with role(s) ${user.roles.join()} - should NOT delete a case`, async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          );

          await deleteCases({
            supertest: supertestWithoutAuth,
            caseIDs: [postedCase.id],
            expectedHttpCode: 403,
            auth: { user, space: 'space1' },
          });
        });
      }

      it('should NOT delete a case in a space with no permissions', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space2',
          }
        );

        /**
         * secOnly does not have access to space2 so it should 403
         */
        await deleteCases({
          supertest: supertestWithoutAuth,
          caseIDs: [postedCase.id],
          expectedHttpCode: 403,
          auth: { user: secOnly, space: 'space2' },
        });
      });

      it('should NOT delete a case created in space2 by making a request to space1', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space2',
          }
        );

        await deleteCases({
          supertest: supertestWithoutAuth,
          caseIDs: [postedCase.id],
          expectedHttpCode: 404,
          auth: { user: secOnly, space: 'space1' },
        });
      });
    });
  });
};
