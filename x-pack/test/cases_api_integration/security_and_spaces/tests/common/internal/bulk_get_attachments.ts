/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ExternalReferenceAttachmentAttributes,
  ExternalReferenceSOAttachmentAttributes,
  Case,
  PersistableStateAttachment,
} from '@kbn/cases-plugin/common/types/domain';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  postCaseReq,
  getPostCaseRequest,
  postCommentUserReq,
  postCommentAlertReq,
  persistableStateAttachment,
  postExternalReferenceSOReq,
  postExternalReferenceESReq,
} from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  createComment,
  bulkCreateAttachments,
  ensureSavedObjectIsAuthorized,
  bulkGetAttachments,
} from '../../../../common/lib/api';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnly,
  obsOnlyRead,
  obsSec,
  obsSecRead,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('bulk_get_attachments', () => {
    describe('setup using two comments', () => {
      let updatedCase: Case;

      before(async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        updatedCase = await bulkCreateAttachments({
          caseId: postedCase.id,
          params: [postCommentUserReq, postCommentAlertReq],
          supertest,
        });
      });

      after(async () => {
        await deleteAllCaseItems(es);
      });

      it('should retrieve a single attachment', async () => {
        const response = await bulkGetAttachments({
          attachmentIds: [updatedCase.comments![0].id],
          caseId: updatedCase.id,
          supertest,
        });

        expect(response.attachments.length).to.be(1);
        expect(response.errors.length).to.be(0);
        expect(response.attachments[0].id).to.eql(updatedCase.comments![0].id);
      });

      it('should retrieve a multiple attachments', async () => {
        const response = await bulkGetAttachments({
          attachmentIds: [updatedCase.comments![0].id, updatedCase.comments![1].id],
          caseId: updatedCase.id,
          supertest,
        });

        expect(response.attachments.length).to.be(2);
        expect(response.errors.length).to.be(0);
        expect(response.attachments[0].id).to.eql(updatedCase.comments![0].id);
        expect(response.attachments[1].id).to.eql(updatedCase.comments![1].id);
      });

      it('populates the errors field with attachments that could not be found', async () => {
        const response = await bulkGetAttachments({
          attachmentIds: [updatedCase.comments![0].id, 'does-not-exist'],
          caseId: updatedCase.id,
          supertest,
          expectedHttpCode: 200,
        });

        expect(response.attachments.length).to.be(1);
        expect(response.errors.length).to.be(1);
        expect(response.errors[0]).to.eql({
          error: 'Not Found',
          message: 'Saved object [cases-comments/does-not-exist] not found',
          status: 404,
          attachmentId: 'does-not-exist',
        });
      });
    });

    describe('inject references into attributes', () => {
      it('should inject the persistable state attachment references into the attributes', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: persistableStateAttachment,
        });

        const response = await bulkGetAttachments({
          attachmentIds: [patchedCase.comments![0].id],
          caseId: patchedCase.id,
          supertest,
        });

        const persistableState = response.attachments[0] as PersistableStateAttachment;

        expect(persistableState.persistableStateAttachmentState).to.eql(
          persistableStateAttachment.persistableStateAttachmentState
        );
      });

      it("should inject saved object external reference style attachment's references into the attributes", async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postExternalReferenceSOReq,
        });

        const response = await bulkGetAttachments({
          attachmentIds: [patchedCase.comments![0].id],
          caseId: patchedCase.id,
          supertest,
        });

        const externalRefSO = response.attachments[0] as ExternalReferenceSOAttachmentAttributes;

        expect(externalRefSO.externalReferenceId).to.eql(
          postExternalReferenceSOReq.externalReferenceId
        );
        expect(externalRefSO.externalReferenceStorage.soType).to.eql(
          postExternalReferenceSOReq.externalReferenceStorage.soType
        );
        expect(externalRefSO.externalReferenceStorage.type).to.eql(
          postExternalReferenceSOReq.externalReferenceStorage.type
        );
      });

      it("should inject the elasticsearch external reference style attachment's references into the attributes", async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postExternalReferenceESReq,
        });

        const response = await bulkGetAttachments({
          attachmentIds: [patchedCase.comments![0].id],
          caseId: patchedCase.id,
          supertest,
        });

        const externalRefES = response.attachments[0] as ExternalReferenceAttachmentAttributes;

        expect(externalRefES.externalReferenceId).to.eql(
          postExternalReferenceESReq.externalReferenceId
        );
        expect(externalRefES.externalReferenceStorage.type).to.eql(
          postExternalReferenceESReq.externalReferenceStorage.type
        );
      });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      describe('security and observability cases', () => {
        let secCase: Case;
        let obsCase: Case;
        let secAttachmentId: string;
        let obsAttachmentId: string;

        beforeEach(async () => {
          [secCase, obsCase] = await Promise.all([
            // Create case owned by the security solution user
            createCase(
              supertestWithoutAuth,
              getPostCaseRequest({ owner: 'securitySolutionFixture' }),
              200,
              {
                user: superUser,
                space: 'space1',
              }
            ),
            // Create case owned by the observability user
            createCase(
              supertestWithoutAuth,
              getPostCaseRequest({ owner: 'observabilityFixture' }),
              200,
              {
                user: superUser,
                space: 'space1',
              }
            ),
          ]);

          [secCase, obsCase] = await Promise.all([
            createComment({
              supertest: supertestWithoutAuth,
              caseId: secCase.id,
              params: postCommentUserReq,
              auth: { user: superUser, space: 'space1' },
            }),
            createComment({
              supertest: supertestWithoutAuth,
              caseId: obsCase.id,
              params: { ...postCommentUserReq, owner: 'observabilityFixture' },
              auth: { user: superUser, space: 'space1' },
            }),
          ]);

          secAttachmentId = secCase.comments![0].id;
          obsAttachmentId = obsCase.comments![0].id;
        });

        it('should be able to read attachments', async () => {
          for (const scenario of [
            {
              user: globalRead,
              owners: ['securitySolutionFixture'],
              caseId: secCase.id,
              attachmentIds: [secAttachmentId],
            },
            {
              user: globalRead,
              owners: ['observabilityFixture'],
              caseId: obsCase.id,
              attachmentIds: [obsAttachmentId],
            },
            {
              user: superUser,
              owners: ['securitySolutionFixture'],
              caseId: secCase.id,
              attachmentIds: [secAttachmentId],
            },
            {
              user: superUser,
              owners: ['observabilityFixture'],
              caseId: obsCase.id,
              attachmentIds: [obsAttachmentId],
            },
            {
              user: secOnlyRead,
              owners: ['securitySolutionFixture'],
              caseId: secCase.id,
              attachmentIds: [secAttachmentId],
            },
            {
              user: obsOnlyRead,
              owners: ['observabilityFixture'],
              caseId: obsCase.id,
              attachmentIds: [obsAttachmentId],
            },
            {
              user: obsSecRead,
              owners: ['securitySolutionFixture'],
              caseId: secCase.id,
              attachmentIds: [secAttachmentId],
            },
            {
              user: obsSecRead,
              owners: ['observabilityFixture'],
              caseId: obsCase.id,
              attachmentIds: [obsAttachmentId],
            },
            {
              user: obsSec,
              owners: ['securitySolutionFixture'],
              caseId: secCase.id,
              attachmentIds: [secAttachmentId],
            },
            {
              user: obsSec,
              owners: ['observabilityFixture'],
              caseId: obsCase.id,
              attachmentIds: [obsAttachmentId],
            },
            {
              user: secOnly,
              owners: ['securitySolutionFixture'],
              caseId: secCase.id,
              attachmentIds: [secAttachmentId],
            },
            {
              user: obsOnly,
              owners: ['observabilityFixture'],
              caseId: obsCase.id,
              attachmentIds: [obsAttachmentId],
            },
          ]) {
            const { attachments, errors } = await bulkGetAttachments({
              supertest: supertestWithoutAuth,
              attachmentIds: scenario.attachmentIds,
              caseId: scenario.caseId,
              auth: { user: scenario.user, space: 'space1' },
            });

            const numberOfCasesThatShouldBeReturned = 1;
            ensureSavedObjectIsAuthorized(
              attachments,
              numberOfCasesThatShouldBeReturned,
              scenario.owners
            );

            expect(errors.length).to.be(0);
          }
        });

        it('should return an association error when an observability attachment is requested for a security case', async () => {
          const { attachments, errors } = await bulkGetAttachments({
            supertest: supertestWithoutAuth,
            attachmentIds: [secAttachmentId, obsAttachmentId],
            caseId: secCase.id,
            auth: { user: secOnlyRead, space: 'space1' },
          });

          expect(attachments.length).to.be(1);
          expect(attachments[0].owner).to.be('securitySolutionFixture');
          expect(errors.length).to.be(1);
          expect(errors[0]).to.eql({
            attachmentId: obsAttachmentId,
            error: 'Bad Request',
            message: `Attachment is not attached to case id=${secCase.id}`,
            status: 400,
          });
        });

        it('should return an authorization error when a security solution user is attempting to retrieve an observability attachment', async () => {
          await bulkGetAttachments({
            supertest: supertestWithoutAuth,
            attachmentIds: [obsAttachmentId],
            caseId: obsCase.id,
            auth: { user: secOnlyRead, space: 'space1' },
            expectedHttpCode: 403,
          });
        });

        it('should return authorization error when a observability user requests a security attachment for a security case', async () => {
          await bulkGetAttachments({
            supertest: supertestWithoutAuth,
            attachmentIds: [secAttachmentId],
            caseId: secCase.id,
            auth: { user: obsOnlyRead, space: 'space1' },
            expectedHttpCode: 403,
          });
        });

        it('should return an error for the observability attachment that is not associated to the case, and an error for an unknown attachment', async () => {
          const { attachments, errors } = await bulkGetAttachments({
            supertest: supertestWithoutAuth,
            attachmentIds: [obsAttachmentId, 'does-not-exist'],
            caseId: secCase.id,
            auth: { user: secOnly, space: 'space1' },
          });

          expect(attachments.length).to.be(0);
          expect(errors.length).to.be(2);
          expect(errors[0]).to.eql({
            error: 'Not Found',
            message: 'Saved object [cases-comments/does-not-exist] not found',
            status: 404,
            attachmentId: 'does-not-exist',
          });
          expect(errors[1]).to.eql({
            attachmentId: obsAttachmentId,
            error: 'Bad Request',
            message: `Attachment is not attached to case id=${secCase.id}`,
            status: 400,
          });
        });
      });

      for (const scenario of [
        { user: noKibanaPrivileges, space: 'space1' },
        { user: secOnly, space: 'space2' },
      ]) {
        it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
          scenario.space
        } - should not bulk get attachments`, async () => {
          // super user creates a case at the appropriate space
          const newCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: scenario.space,
            }
          );

          const patchedCase = await createComment({
            supertest: supertestWithoutAuth,
            caseId: newCase.id,
            params: postCommentUserReq,
            auth: { user: superUser, space: scenario.space },
          });

          await bulkGetAttachments({
            supertest: supertestWithoutAuth,
            attachmentIds: [patchedCase.comments![0].id],
            caseId: newCase.id,
            auth: {
              user: scenario.user,
              space: scenario.space,
            },
            expectedHttpCode: 403,
          });
        });
      }
    });

    describe('errors', () => {
      it('400s when requesting more than 100 attachments', async () => {
        await bulkGetAttachments({
          attachmentIds: Array(101).fill('foobar'),
          caseId: 'id',
          expectedHttpCode: 400,
          supertest,
        });
      });

      it('400s when requesting zero attachments', async () => {
        await bulkGetAttachments({
          attachmentIds: [],
          caseId: 'id',
          expectedHttpCode: 400,
          supertest,
        });
      });
    });
  });
};
