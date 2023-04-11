/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type SuperTest from 'supertest';
import { MAX_DOCS_PER_PAGE } from '@kbn/cases-plugin/common/constants';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  getFilesAttachmentReq,
  getPostCaseRequest,
  postCommentUserReq,
} from '../../../../common/lib/mock';
import {
  createCase,
  deleteCases,
  createComment,
  getComment,
  getCase,
  superUserSpace1Auth,
  getCaseUserActions,
  deleteAllCaseItems,
  createAndUploadFile,
  deleteAllFiles,
  listFiles,
  findAttachments,
  bulkCreateAttachments,
} from '../../../../common/lib/api';
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
import {
  secAllUser,
  users as api_int_users,
} from '../../../../../api_integration/apis/cases/common/users';
import { roles as api_int_roles } from '../../../../../api_integration/apis/cases/common/roles';
import { createUsersAndRoles, deleteUsersAndRoles } from '../../../../common/lib/authentication';
import {
  OBSERVABILITY_FILE_KIND,
  SECURITY_SOLUTION_FILE_KIND,
} from '../../../../common/lib/constants';
import { User } from '../../../../common/lib/authentication/types';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const es = getService('es');

  describe('delete_cases', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should delete a case', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      const body = await deleteCases({ supertest, caseIDs: [postedCase.id] });

      expect(body).to.eql({});
    });

    it('should delete multiple cases and their user actions', async () => {
      const [case1, case2] = await Promise.all([
        createCase(supertest, getPostCaseRequest()),
        createCase(supertest, getPostCaseRequest()),
      ]);

      await deleteCases({ supertest, caseIDs: [case1.id, case2.id] });

      const userActionsCase1 = await getCaseUserActions({ supertest, caseID: case1.id });
      expect(userActionsCase1.length).to.be(0);

      const userActionsCase2 = await getCaseUserActions({ supertest, caseID: case2.id });
      expect(userActionsCase2.length).to.be(0);
    });

    it(`should delete a case's comments and user actions when that case gets deleted`, async () => {
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

      const userActions = await getCaseUserActions({ supertest, caseID: postedCase.id });
      expect(userActions.length).to.be(0);
    });

    it('should delete all user actions when deleting a case', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      await deleteCases({ supertest, caseIDs: [postedCase.id] });
      const userActions = await getCaseUserActions({ supertest, caseID: postedCase.id });
      expect(userActions.length).to.be(0);
    });

    it('unhappy path - 404s when case is not there', async () => {
      await deleteCases({ supertest, caseIDs: ['fake-id'], expectedHttpCode: 404 });
    });

    describe('files', () => {
      afterEach(async () => {
        await deleteAllFiles({
          supertest,
        });
      });

      it('should delete all files associated with a case', async () => {
        const { caseInfo: postedCase } = await createCaseWithFiles({
          supertest: supertestWithoutAuth,
          fileKind: SECURITY_SOLUTION_FILE_KIND,
          owner: 'securitySolution',
        });

        await deleteCases({ supertest: supertestWithoutAuth, caseIDs: [postedCase.id] });

        const [filesAfterDelete, attachmentsAfterDelete] = await Promise.all([
          listFiles({
            supertest: supertestWithoutAuth,
            params: {
              kind: SECURITY_SOLUTION_FILE_KIND,
            },
          }),
          findAttachments({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            query: {
              perPage: MAX_DOCS_PER_PAGE,
            },
          }),
        ]);

        expect(filesAfterDelete.total).to.be(0);
        expect(attachmentsAfterDelete.comments.length).to.be(0);
      });

      it('should delete all files associated with multiple cases', async () => {
        const [{ caseInfo: postedCase1 }, { caseInfo: postedCase2 }] = await Promise.all([
          createCaseWithFiles({
            supertest: supertestWithoutAuth,
            fileKind: SECURITY_SOLUTION_FILE_KIND,
            owner: 'securitySolution',
          }),
          createCaseWithFiles({
            supertest: supertestWithoutAuth,
            fileKind: SECURITY_SOLUTION_FILE_KIND,
            owner: 'securitySolution',
          }),
        ]);

        await deleteCases({
          supertest: supertestWithoutAuth,
          caseIDs: [postedCase1.id, postedCase2.id],
        });

        const [filesAfterDelete, attachmentsAfterDelete, attachmentsAfterDelete2] =
          await Promise.all([
            listFiles({
              supertest: supertestWithoutAuth,
              params: {
                kind: SECURITY_SOLUTION_FILE_KIND,
              },
            }),
            findAttachments({
              supertest: supertestWithoutAuth,
              caseId: postedCase1.id,
              query: {
                perPage: MAX_DOCS_PER_PAGE,
              },
            }),
            findAttachments({
              supertest: supertestWithoutAuth,
              caseId: postedCase2.id,
              query: {
                perPage: MAX_DOCS_PER_PAGE,
              },
            }),
          ]);

        expect(filesAfterDelete.total).to.be(0);
        expect(attachmentsAfterDelete.comments.length).to.be(0);
        expect(attachmentsAfterDelete2.comments.length).to.be(0);
      });
    });

    describe('rbac', () => {
      describe('files', () => {
        // we need api_int_users and roles because they have authorization for the actual plugins (not the fixtures). This
        // is needed because the fixture plugins are not registered as file kinds
        before(async () => {
          await createUsersAndRoles(getService, api_int_users, api_int_roles);
        });

        after(async () => {
          await deleteUsersAndRoles(getService, api_int_users, api_int_roles);
        });

        it('should delete a case when the user has access to delete the case and files', async () => {
          const { caseInfo: postedCase } = await createCaseWithFiles({
            supertest: supertestWithoutAuth,
            fileKind: SECURITY_SOLUTION_FILE_KIND,
            owner: 'securitySolution',
            auth: { user: secAllUser, space: 'space1' },
          });

          await deleteCases({
            supertest: supertestWithoutAuth,
            caseIDs: [postedCase.id],
            auth: { user: secAllUser, space: 'space1' },
          });

          const [filesAfterDelete, attachmentsAfterDelete] = await Promise.all([
            listFiles({
              supertest: supertestWithoutAuth,
              params: {
                kind: SECURITY_SOLUTION_FILE_KIND,
              },
              auth: { user: secAllUser, space: 'space1' },
            }),
            findAttachments({
              supertest: supertestWithoutAuth,
              caseId: postedCase.id,
              query: {
                perPage: MAX_DOCS_PER_PAGE,
              },
              auth: { user: secAllUser, space: 'space1' },
            }),
          ]);

          expect(filesAfterDelete.total).to.be(0);
          expect(attachmentsAfterDelete.comments.length).to.be(0);
        });

        it('should not delete a case when the user does not have access to the file kind of the files', async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolution' }),
            200,
            { user: secAllUser, space: 'space1' }
          );
          const { create: createdFile } = await createAndUploadFile({
            supertest: supertestWithoutAuth,
            createFileParams: {
              name: 'testfile',
              // use observability for the file kind which the security user should not have access to
              kind: OBSERVABILITY_FILE_KIND,
              mimeType: 'text/plain',
              meta: {
                caseIds: [postedCase.id],
                owner: [postedCase.owner],
              },
            },
            data: 'abc',
            auth: { user: superUser, space: 'space1' },
          });

          await bulkCreateAttachments({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: [
              getFilesAttachmentReq({
                externalReferenceId: createdFile.file.id,
                owner: 'securitySolution',
              }),
            ],
            auth: { user: secAllUser, space: 'space1' },
          });

          await deleteCases({
            supertest: supertestWithoutAuth,
            caseIDs: [postedCase.id],
            auth: { user: secAllUser, space: 'space1' },
            expectedHttpCode: 403,
          });

          const [filesAfterDelete, attachmentsAfterDelete] = await Promise.all([
            listFiles({
              supertest: supertestWithoutAuth,
              params: {
                kind: OBSERVABILITY_FILE_KIND,
              },
              auth: { user: superUser, space: 'space1' },
            }),
            findAttachments({
              supertest: supertestWithoutAuth,
              caseId: postedCase.id,
              query: {
                perPage: MAX_DOCS_PER_PAGE,
              },
              auth: { user: secAllUser, space: 'space1' },
            }),
          ]);

          expect(filesAfterDelete.total).to.be(1);
          expect(attachmentsAfterDelete.comments.length).to.be(1);
        });
      });

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

const createCaseWithFiles = async ({
  supertest,
  fileKind,
  owner,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  fileKind: string;
  owner: string;
  auth?: { user: User; space: string | null };
}) => {
  const postedCase = await createCase(supertest, getPostCaseRequest({ owner }), 200, auth);

  const files = await Promise.all([
    createAndUploadFile({
      supertest,
      createFileParams: {
        name: 'testfile',
        kind: fileKind,
        mimeType: 'text/plain',
        meta: {
          caseIds: [postedCase.id],
          owner: [postedCase.owner],
        },
      },
      data: 'abc',
      auth,
    }),
    createAndUploadFile({
      supertest,
      createFileParams: {
        name: 'testfile',
        kind: fileKind,
        mimeType: 'text/plain',
        meta: {
          caseIds: [postedCase.id],
          owner: [postedCase.owner],
        },
      },
      data: 'abc',
      auth,
    }),
  ]);

  const caseWithAttachments = await bulkCreateAttachments({
    supertest,
    caseId: postedCase.id,
    params: [
      getFilesAttachmentReq({
        externalReferenceId: files[0].create.file.id,
        owner,
      }),
      getFilesAttachmentReq({
        externalReferenceId: files[1].create.file.id,
        owner,
      }),
    ],
    auth,
  });

  return {
    caseInfo: caseWithAttachments,
    attachments: files,
  };
};
