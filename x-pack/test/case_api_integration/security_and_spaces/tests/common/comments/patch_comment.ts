/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../../plugins/cases/common/constants';
import {
  AttributesTypeAlerts,
  AttributesTypeUser,
  CaseResponse,
  CommentType,
} from '../../../../../../plugins/cases/common/api';
import {
  defaultUser,
  postCaseReq,
  postCommentUserReq,
  postCommentAlertReq,
  getPostCaseRequest,
} from '../../../../common/lib/mock';
import {
  createCaseAction,
  createSubCase,
  deleteAllCaseItems,
  deleteCaseAction,
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  createCase,
  createComment,
  updateComment,
  superUserSpace1Auth,
} from '../../../../common/lib/utils';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnly,
  obsOnlyRead,
  obsSecRead,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('patch_comment', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    it('should return a 400 when the subCaseId parameter is passed', async () => {
      const { body } = await supertest
        .patch(`${CASES_URL}/case-id}/comments?subCaseId=value`)
        .set('kbn-xsrf', 'true')
        .send({
          id: 'id',
          version: 'version',
          type: CommentType.alert,
          alertId: 'test-id',
          index: 'test-index',
          rule: {
            id: 'id',
            name: 'name',
          },
          owner: 'securitySolutionFixture',
        })
        .expect(400);

      expect(body.message).to.contain('disabled');
    });

    // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
    describe.skip('sub case comments', () => {
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

      it('patches a comment for a sub case', async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
        const { body: patchedSubCase }: { body: CaseResponse } = await supertest
          .post(`${CASES_URL}/${caseInfo.id}/comments?subCaseId=${caseInfo.subCases![0].id}`)
          .set('kbn-xsrf', 'true')
          .send(postCommentUserReq)
          .expect(200);

        const newComment = 'Well I decided to update my comment. So what? Deal with it.';
        const { body: patchedSubCaseUpdatedComment } = await supertest
          .patch(`${CASES_URL}/${caseInfo.id}/comments?subCaseId=${caseInfo.subCases![0].id}`)
          .set('kbn-xsrf', 'true')
          .send({
            id: patchedSubCase.comments![1].id,
            version: patchedSubCase.comments![1].version,
            comment: newComment,
            type: CommentType.user,
          })
          .expect(200);

        expect(patchedSubCaseUpdatedComment.comments.length).to.be(2);
        expect(patchedSubCaseUpdatedComment.comments[0].type).to.be(CommentType.generatedAlert);
        expect(patchedSubCaseUpdatedComment.comments[1].type).to.be(CommentType.user);
        expect(patchedSubCaseUpdatedComment.comments[1].comment).to.be(newComment);
      });

      it('fails to update the generated alert comment type', async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
        await supertest
          .patch(`${CASES_URL}/${caseInfo.id}/comments?subCaseId=${caseInfo.subCases![0].id}`)
          .set('kbn-xsrf', 'true')
          .send({
            id: caseInfo.comments![0].id,
            version: caseInfo.comments![0].version,
            type: CommentType.alert,
            alertId: 'test-id',
            index: 'test-index',
            rule: {
              id: 'id',
              name: 'name',
            },
          })
          .expect(400);
      });

      it('fails to update the generated alert comment by using another generated alert comment', async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
        await supertest
          .patch(`${CASES_URL}/${caseInfo.id}/comments?subCaseId=${caseInfo.subCases![0].id}`)
          .set('kbn-xsrf', 'true')
          .send({
            id: caseInfo.comments![0].id,
            version: caseInfo.comments![0].version,
            type: CommentType.generatedAlert,
            alerts: [{ _id: 'id1' }],
            index: 'test-index',
            rule: {
              id: 'id',
              name: 'name',
            },
          })
          .expect(400);
      });
    });

    it('should patch a comment', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });

      const newComment = 'Well I decided to update my comment. So what? Deal with it.';
      const updatedCase = await updateComment({
        supertest,
        caseId: postedCase.id,
        req: {
          id: patchedCase.comments![0].id,
          version: patchedCase.comments![0].version,
          comment: newComment,
          type: CommentType.user,
          owner: 'securitySolutionFixture',
        },
      });

      const userComment = updatedCase.comments![0] as AttributesTypeUser;
      expect(userComment.comment).to.eql(newComment);
      expect(userComment.type).to.eql(CommentType.user);
      expect(updatedCase.updated_by).to.eql(defaultUser);
    });

    it('should patch an alert', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentAlertReq,
      });
      const updatedCase = await updateComment({
        supertest,
        caseId: postedCase.id,
        req: {
          id: patchedCase.comments![0].id,
          version: patchedCase.comments![0].version,
          type: CommentType.alert,
          alertId: 'new-id',
          index: postCommentAlertReq.index,
          rule: {
            id: 'id',
            name: 'name',
          },
          owner: 'securitySolutionFixture',
        },
      });

      const alertComment = updatedCase.comments![0] as AttributesTypeAlerts;
      expect(alertComment.alertId).to.eql('new-id');
      expect(alertComment.index).to.eql(postCommentAlertReq.index);
      expect(alertComment.type).to.eql(CommentType.alert);
      expect(alertComment.rule).to.eql({
        id: 'id',
        name: 'name',
      });
      expect(alertComment.updated_by).to.eql(defaultUser);
    });

    it('should not allow updating the owner of a comment', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });

      await updateComment({
        supertest,
        caseId: postedCase.id,
        req: {
          id: patchedCase.comments![0].id,
          version: patchedCase.comments![0].version,
          type: CommentType.user,
          comment: postCommentUserReq.comment,
          owner: 'changedOwner',
        },
        expectedHttpCode: 400,
      });
    });

    it('unhappy path - 404s when comment is not there', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await updateComment({
        supertest,
        caseId: postedCase.id,
        req: {
          id: 'id',
          version: 'version',
          type: CommentType.user,
          comment: 'comment',
          owner: 'securitySolutionFixture',
        },
        expectedHttpCode: 404,
      });
    });

    it('unhappy path - 404s when case is not there', async () => {
      await updateComment({
        supertest,
        caseId: 'fake-id',
        req: {
          id: 'id',
          version: 'version',
          type: CommentType.user,
          comment: 'comment',
          owner: 'securitySolutionFixture',
        },
        expectedHttpCode: 404,
      });
    });

    it('unhappy path - 400s when trying to change comment type', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });

      await updateComment({
        supertest,
        caseId: postedCase.id,
        req: {
          id: patchedCase.comments![0].id,
          version: patchedCase.comments![0].version,
          type: CommentType.alert,
          alertId: 'test-id',
          index: 'test-index',
          rule: {
            id: 'id',
            name: 'name',
          },
          owner: 'securitySolutionFixture',
        },
        expectedHttpCode: 400,
      });
    });

    it('unhappy path - 400s when missing attributes for type user', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });

      await updateComment({
        supertest,
        caseId: postedCase.id,
        // @ts-expect-error
        req: {
          id: patchedCase.comments![0].id,
          version: patchedCase.comments![0].version,
        },
        expectedHttpCode: 400,
      });
    });

    it('unhappy path - 400s when adding excess attributes for type user', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });

      for (const attribute of ['alertId', 'index']) {
        await updateComment({
          supertest,
          caseId: postedCase.id,
          req: {
            id: patchedCase.comments![0].id,
            version: patchedCase.comments![0].version,
            comment: 'a comment',
            type: CommentType.user,
            [attribute]: attribute,
            owner: 'securitySolutionFixture',
          },
          expectedHttpCode: 400,
        });
      }
    });

    it('unhappy path - 400s when missing attributes for type alert', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentAlertReq,
      });

      const allRequestAttributes = {
        type: CommentType.alert,
        index: 'test-index',
        alertId: 'test-id',
        rule: {
          id: 'id',
          name: 'name',
        },
      };

      for (const attribute of ['alertId', 'index']) {
        const requestAttributes = omit(attribute, allRequestAttributes);
        await updateComment({
          supertest,
          caseId: postedCase.id,
          // @ts-expect-error
          req: {
            id: patchedCase.comments![0].id,
            version: patchedCase.comments![0].version,
            ...requestAttributes,
          },
          expectedHttpCode: 400,
        });
      }
    });

    it('unhappy path - 400s when adding excess attributes for type alert', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentAlertReq,
      });

      for (const attribute of ['comment']) {
        await updateComment({
          supertest,
          caseId: postedCase.id,
          req: {
            id: patchedCase.comments![0].id,
            version: patchedCase.comments![0].version,
            type: CommentType.alert,
            index: 'test-index',
            alertId: 'test-id',
            rule: {
              id: 'id',
              name: 'name',
            },
            owner: 'securitySolutionFixture',
            [attribute]: attribute,
          },
          expectedHttpCode: 400,
        });
      }
    });

    it('unhappy path - 409s when conflict', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });

      const newComment = 'Well I decided to update my comment. So what? Deal with it.';
      await updateComment({
        supertest,
        caseId: postedCase.id,
        req: {
          id: patchedCase.comments![0].id,
          version: 'version-mismatch',
          type: CommentType.user,
          comment: newComment,
          owner: 'securitySolutionFixture',
        },
        expectedHttpCode: 409,
      });
    });

    describe('alert format', () => {
      type AlertComment = CommentType.alert | CommentType.generatedAlert;

      // ENABLE_CASE_CONNECTOR: once the case connector feature is completed create a test case for generated alerts here
      for (const [alertId, index, type] of [
        ['1', ['index1', 'index2'], CommentType.alert],
        [['1', '2'], 'index', CommentType.alert],
      ]) {
        it(`throws an error with an alert comment with contents id: ${alertId} indices: ${index} type: ${type}`, async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          const patchedCase = await createComment({
            supertest,
            caseId: postedCase.id,
            params: postCommentAlertReq,
          });

          await updateComment({
            supertest,
            caseId: patchedCase.id,
            req: {
              id: patchedCase.comments![0].id,
              version: patchedCase.comments![0].version,
              type: type as AlertComment,
              alertId,
              index,
              owner: 'securitySolutionFixture',
              rule: postCommentAlertReq.rule,
            },
            expectedHttpCode: 400,
          });
        });
      }

      for (const [alertId, index, type] of [
        ['1', ['index1'], CommentType.alert],
        [['1', '2'], ['index', 'other-index'], CommentType.alert],
      ]) {
        it(`does not throw an error with an alert comment with contents id: ${alertId} indices: ${index} type: ${type}`, async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          const patchedCase = await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              ...postCommentAlertReq,
              alertId,
              index,
              owner: 'securitySolutionFixture',
              type: type as AlertComment,
            },
          });

          await updateComment({
            supertest,
            caseId: postedCase.id,
            req: {
              id: patchedCase.comments![0].id,
              version: patchedCase.comments![0].version,
              type: type as AlertComment,
              alertId,
              index,
              owner: 'securitySolutionFixture',
              rule: postCommentAlertReq.rule,
            },
          });
        });
      }
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      it('should update a comment that the user has permissions for', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: superUserSpace1Auth,
        });

        const newComment = 'Well I decided to update my comment. So what? Deal with it.';
        const updatedCase = await updateComment({
          supertest,
          caseId: postedCase.id,
          req: {
            ...postCommentUserReq,
            id: patchedCase.comments![0].id,
            version: patchedCase.comments![0].version,
            comment: newComment,
          },
          auth: { user: secOnly, space: 'space1' },
        });

        const userComment = updatedCase.comments![0] as AttributesTypeUser;
        expect(userComment.comment).to.eql(newComment);
        expect(userComment.type).to.eql(CommentType.user);
        expect(updatedCase.updated_by).to.eql(defaultUser);
        expect(userComment.owner).to.eql('securitySolutionFixture');
      });

      it('should not update a comment that has a different owner thant he user has access to', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        const patchedCase = await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: superUserSpace1Auth,
        });

        const newComment = 'Well I decided to update my comment. So what? Deal with it.';
        await updateComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          req: {
            ...postCommentUserReq,
            id: patchedCase.comments![0].id,
            version: patchedCase.comments![0].version,
            comment: newComment,
          },
          auth: { user: obsOnly, space: 'space1' },
          expectedHttpCode: 403,
        });
      });

      for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
        it(`User ${
          user.username
        } with role(s) ${user.roles.join()} - should NOT update a comment`, async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            superUserSpace1Auth
          );

          const patchedCase = await createComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: postCommentUserReq,
            auth: superUserSpace1Auth,
          });

          const newComment = 'Well I decided to update my comment. So what? Deal with it.';
          await updateComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            req: {
              ...postCommentUserReq,
              id: patchedCase.comments![0].id,
              version: patchedCase.comments![0].version,
              comment: newComment,
            },
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        });
      }

      it('should not update a comment in a space the user does not have permissions', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          { user: superUser, space: 'space2' }
        );

        const patchedCase = await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: { user: superUser, space: 'space2' },
        });

        const newComment = 'Well I decided to update my comment. So what? Deal with it.';
        await updateComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          req: {
            ...postCommentUserReq,
            id: patchedCase.comments![0].id,
            version: patchedCase.comments![0].version,
            comment: newComment,
          },
          auth: { user: secOnly, space: 'space2' },
          // getting the case will fail in the saved object layer with a 403
          expectedHttpCode: 403,
        });
      });
    });
  });
};
