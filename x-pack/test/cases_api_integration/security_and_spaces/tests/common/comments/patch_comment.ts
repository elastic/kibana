/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { omit } from 'lodash/fp';
import expect from '@kbn/expect';
import {
  AlertAttachmentAttributes,
  UserCommentAttachmentAttributes,
  AttachmentType,
  CaseStatuses,
} from '@kbn/cases-plugin/common/types/domain';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  defaultUser,
  postCaseReq,
  postCommentUserReq,
  postCommentAlertReq,
  getPostCaseRequest,
  getFilesAttachmentReq,
  fileAttachmentMetadata,
} from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  createCase,
  createComment,
  updateComment,
  superUserSpace1Auth,
  removeServerGeneratedPropertiesFromSavedObject,
  updateCase,
} from '../../../../common/lib/api';
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
          type: AttachmentType.user,
          owner: 'securitySolutionFixture',
        },
      });

      const userComment = updatedCase.comments![0] as UserCommentAttachmentAttributes;
      expect(userComment.comment).to.eql(newComment);
      expect(userComment.type).to.eql(AttachmentType.user);
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
          type: AttachmentType.alert,
          alertId: 'new-id',
          index: postCommentAlertReq.index,
          rule: {
            id: 'id',
            name: 'name',
          },
          owner: 'securitySolutionFixture',
        },
      });

      const alertComment = updatedCase.comments![0] as AlertAttachmentAttributes;
      expect(alertComment.alertId).to.eql('new-id');
      expect(alertComment.index).to.eql(postCommentAlertReq.index);
      expect(alertComment.type).to.eql(AttachmentType.alert);
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
          type: AttachmentType.user,
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
          type: AttachmentType.user,
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
          type: AttachmentType.user,
          comment: 'comment',
          owner: 'securitySolutionFixture',
        },
        expectedHttpCode: 404,
      });
    });

    it('unhappy path - 400s when comment is too long', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });
      const longComment = Array(30001).fill('a').toString();

      await updateComment({
        supertest,
        caseId: postedCase.id,
        req: {
          id: patchedCase.comments![0].id,
          version: patchedCase.comments![0].version,
          type: AttachmentType.user,
          comment: longComment,
          owner: 'securitySolutionFixture',
        },
        expectedHttpCode: 400,
      });
    });

    it('unhappy path - 400s when comment is empty', async () => {
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
          type: AttachmentType.user,
          comment: '',
          owner: 'securitySolutionFixture',
        },
        expectedHttpCode: 400,
      });
    });

    it('unhappy path - 400s when comment is a string of empty characters', async () => {
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
          type: AttachmentType.user,
          comment: '   ',
          owner: 'securitySolutionFixture',
        },
        expectedHttpCode: 400,
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
          type: AttachmentType.alert,
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
            type: AttachmentType.user,
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
        type: AttachmentType.alert,
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
            type: AttachmentType.alert,
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
          type: AttachmentType.user,
          comment: newComment,
          owner: 'securitySolutionFixture',
        },
        expectedHttpCode: 409,
      });
    });

    describe('files', () => {
      it('should update the file attachment name to superfile', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: getFilesAttachmentReq(),
        });

        const attachmentWithUpdatedFileName = set(
          getFilesAttachmentReq(),
          'externalReferenceMetadata.files[0].name',
          'superfile'
        );

        const updatedCase = await updateComment({
          supertest,
          caseId: postedCase.id,
          req: {
            ...attachmentWithUpdatedFileName,
            id: patchedCase.comments![0].id,
            version: patchedCase.comments![0].version,
          },
        });

        const comparableAttachmentFields = removeServerGeneratedPropertiesFromSavedObject(
          updatedCase.comments![0]
        );

        expect(comparableAttachmentFields).to.eql({
          ...attachmentWithUpdatedFileName,
          pushed_at: null,
          pushed_by: null,
          updated_by: defaultUser,
          created_by: defaultUser,
          owner: 'securitySolutionFixture',
        });
      });

      it('should return a 400 when attempting to update a file attachment with empty metadata', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: getFilesAttachmentReq(),
        });

        await updateComment({
          supertest,
          caseId: postedCase.id,
          req: {
            ...getFilesAttachmentReq({ externalReferenceMetadata: {} }),
            id: patchedCase.comments![0].id,
            version: patchedCase.comments![0].version,
          },
          expectedHttpCode: 400,
        });
      });

      it('should return a 400 when attempting to update a file attachment with invalid metadata', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: getFilesAttachmentReq(),
        });

        await updateComment({
          supertest,
          caseId: postedCase.id,
          req: {
            ...getFilesAttachmentReq({
              // intentionally creating an invalid format here by using foo instead of files
              externalReferenceMetadata: { foo: fileAttachmentMetadata.files },
            }),
            id: patchedCase.comments![0].id,
            version: patchedCase.comments![0].version,
          },
          expectedHttpCode: 400,
        });
      });
    });

    describe('alert format', () => {
      type AlertComment = AttachmentType.alert;

      for (const [alertId, index, type] of [
        ['1', ['index1', 'index2'], AttachmentType.alert],
        [['1', '2'], 'index', AttachmentType.alert],
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
        ['1', ['index1'], AttachmentType.alert],
        [['1', '2'], ['index', 'other-index'], AttachmentType.alert],
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

    describe('partial updates', () => {
      it('should not result to a version conflict (409) when updating a comment to an updated case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const caseWithComments = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
          expectedHttpCode: 200,
        });

        /**
         * Updating the status of the case will
         * change the version of the case
         */
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: caseWithComments.id,
                version: caseWithComments.version,
                status: CaseStatuses['in-progress'],
              },
            ],
          },
        });

        await updateComment({
          supertest,
          caseId: postedCase.id,
          req: {
            id: caseWithComments.comments![0].id,
            version: caseWithComments.comments![0].version,
            comment: 'my new comment',
            type: AttachmentType.user,
            owner: 'securitySolutionFixture',
          },
          expectedHttpCode: 200,
        });
      });
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

        const userComment = updatedCase.comments![0] as UserCommentAttachmentAttributes;
        expect(userComment.comment).to.eql(newComment);
        expect(userComment.type).to.eql(AttachmentType.user);
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
