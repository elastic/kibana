/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Case } from '@kbn/cases-plugin/common';
import { constructFileKindIdByOwner } from '@kbn/cases-plugin/common/files';
import { Owner } from '@kbn/cases-plugin/common/constants/types';
import { CASES_TEST_FIXTURE_FILE_KIND_ID } from '@kbn/cases-api-integration-test-plugin/server/files';
import { getFilesAttachmentReq, getPostCaseRequest } from '../../../../common/lib/mock';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  bulkCreateAttachments,
  bulkGetAttachments,
  createAndUploadFile,
  createCase,
  createFile,
  deleteAllCaseItems,
  deleteAllFiles,
  bulkDeleteFileAttachments,
  getComment,
  listFiles,
} from '../../../../common/lib/api';
import { SECURITY_SOLUTION_FILE_KIND } from '../../../../common/lib/constants';
import {
  globalRead,
  noKibanaPrivileges,
  superUser,
} from '../../../../common/lib/authentication/users';
import { createUsersAndRoles, deleteUsersAndRoles } from '../../../../common/lib/authentication';
import {
  casesAllUser,
  obsCasesAllUser,
  obsCasesReadUser,
  obsSecCasesAllUser,
  obsSecCasesReadUser,
  secAllSpace1User,
  secAllUser,
  secReadUser,
  users as api_int_users,
} from '../../../../../api_integration/apis/cases/common/users';
import { roles as api_int_roles } from '../../../../../api_integration/apis/cases/common/roles';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('bulk_delete_file_attachments', () => {
    // we need api_int_users and roles because they have authorization for the actual plugins (not the fixtures). This
    // is needed because the fixture plugins are not registered as file kinds
    before(async () => {
      await createUsersAndRoles(getService, api_int_users, api_int_roles);
    });

    after(async () => {
      await deleteUsersAndRoles(getService, api_int_users, api_int_roles);
    });

    describe('failures', () => {
      let postedCase: Case;

      before(async () => {
        postedCase = await createCase(supertest, getPostCaseRequest());
      });

      after(async () => {
        await deleteAllFiles({
          supertest,
        });
        await deleteAllCaseItems(es);
      });

      it('returns a 400 when attempting to delete a file with a file kind that is not within a case plugin', async () => {
        const postedSecCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolution' }),
          200,
          {
            user: superUser,
            space: 'space1',
          }
        );

        const create = await createFile({
          supertest: supertestWithoutAuth,
          params: {
            name: 'testfile',
            kind: CASES_TEST_FIXTURE_FILE_KIND_ID,
            mimeType: 'text/plain',
            meta: {
              caseIds: [postedSecCase.id],
              owner: ['securitySolution'],
            },
          },
          auth: { user: superUser, space: 'space1' },
        });

        await bulkCreateAttachments({
          supertest: supertestWithoutAuth,
          caseId: postedSecCase.id,
          params: [
            getFilesAttachmentReq({
              externalReferenceId: create.file.id,
              owner: 'securitySolution',
            }),
          ],
          auth: { user: superUser, space: 'space1' },
        });

        await bulkDeleteFileAttachments({
          supertest: supertestWithoutAuth,
          caseId: postedSecCase.id,
          fileIds: [create.file.id],
          auth: { user: superUser, space: 'space1' },
          expectedHttpCode: 400,
        });
      });

      it('returns a 400 when the fileIds is an empty array', async () => {
        await bulkDeleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: [],
          expectedHttpCode: 400,
        });
      });

      it('returns a 400 when the a fileId is an empty string', async () => {
        await bulkDeleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: ['abc', ''],
          expectedHttpCode: 400,
        });
      });

      it('returns a 400 when there are 11 ids being deleted', async () => {
        const ids = Array.from(Array(11).keys()).map((item) => item.toString());
        await bulkDeleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: ids,
          expectedHttpCode: 400,
        });
      });

      it('fails to delete a file when the case id is not within the metadata', async () => {
        const create = await createFile({
          supertest,
          params: {
            name: 'testfile',
            kind: SECURITY_SOLUTION_FILE_KIND,
            mimeType: 'text/plain',
            meta: {
              owner: [postedCase.owner],
            },
          },
        });

        await bulkDeleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: [create.file.id],
          expectedHttpCode: 400,
        });
      });

      it('fails to delete a file when the case id does not match the id in the request', async () => {
        const create = await createFile({
          supertest,
          params: {
            name: 'testfile',
            kind: SECURITY_SOLUTION_FILE_KIND,
            mimeType: 'text/plain',
            meta: {
              caseIds: ['abc'],
              owner: [postedCase.owner],
            },
          },
        });

        await bulkDeleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: [create.file.id],
          expectedHttpCode: 400,
        });
      });

      it('fails to delete a file when the case id is not an array', async () => {
        const create = await createFile({
          supertest,
          params: {
            name: 'testfile',
            kind: SECURITY_SOLUTION_FILE_KIND,
            mimeType: 'text/plain',
            meta: {
              caseIds: postedCase.id,
              owner: [postedCase.owner],
            },
          },
        });

        await bulkDeleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: [create.file.id],
          expectedHttpCode: 400,
        });
      });

      it('fails to delete a file when the case ids is an array of more than one item', async () => {
        const create = await createFile({
          supertest,
          params: {
            name: 'testfile',
            kind: SECURITY_SOLUTION_FILE_KIND,
            mimeType: 'text/plain',
            meta: {
              caseIds: [postedCase.id, postedCase.id],
              owner: [postedCase.owner],
            },
          },
        });

        await bulkDeleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: [create.file.id],
          expectedHttpCode: 400,
        });
      });
    });

    describe('deletes files when there are no case attachments', () => {
      afterEach(async () => {
        await deleteAllFiles({
          supertest,
        });
        await deleteAllCaseItems(es);
      });

      it('returns a 204 when the file does not exist', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        await bulkDeleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: ['abc'],
          expectedHttpCode: 204,
        });
      });

      it('deletes a file when the owner is not formatted as an array of strings', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        const create = await createFile({
          supertest,
          params: {
            name: 'testfile',
            kind: SECURITY_SOLUTION_FILE_KIND,
            mimeType: 'text/plain',
            meta: {
              caseIds: [postedCase.id],
              owner: postedCase.owner,
            },
          },
        });

        await bulkDeleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: [create.file.id],
          expectedHttpCode: 204,
        });
      });

      it('deletes a file when the owner is not within the metadata', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        const create = await createFile({
          supertest,
          params: {
            name: 'testfile',
            kind: SECURITY_SOLUTION_FILE_KIND,
            mimeType: 'text/plain',
            meta: {
              caseIds: [postedCase.id],
            },
          },
        });

        await bulkDeleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: [create.file.id],
          expectedHttpCode: 204,
        });
      });

      it('deletes a single file', async () => {
        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({ owner: 'securitySolution' })
        );

        const { create } = await createAndUploadFile({
          supertest,
          createFileParams: {
            name: 'testfile',
            kind: SECURITY_SOLUTION_FILE_KIND,
            mimeType: 'text/plain',
            meta: {
              caseIds: [postedCase.id],
              owner: [postedCase.owner],
            },
          },
          data: 'abc',
        });

        const filesBeforeDelete = await listFiles({
          supertest,
          params: {
            kind: SECURITY_SOLUTION_FILE_KIND,
          },
        });

        expect(filesBeforeDelete.total).to.be(1);

        await bulkDeleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: [create.file.id],
        });

        const filesAfterDelete = await listFiles({
          supertest,
          params: {
            kind: SECURITY_SOLUTION_FILE_KIND,
          },
        });

        expect(filesAfterDelete.total).to.be(0);
      });

      it('deletes multiple files', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        const [fileInfo1, fileInfo2] = await Promise.all([
          createAndUploadFile({
            supertest,
            createFileParams: {
              name: 'file1',
              kind: SECURITY_SOLUTION_FILE_KIND,
              mimeType: 'text/plain',
              meta: {
                caseIds: [postedCase.id],
                owner: [postedCase.owner],
              },
            },
            data: 'abc',
          }),
          createAndUploadFile({
            supertest,
            createFileParams: {
              name: 'file2',
              kind: SECURITY_SOLUTION_FILE_KIND,
              mimeType: 'text/plain',
              meta: {
                caseIds: [postedCase.id],
                owner: [postedCase.owner],
              },
            },
            data: 'abc',
          }),
        ]);

        const filesBeforeDelete = await listFiles({
          supertest,
          params: {
            kind: SECURITY_SOLUTION_FILE_KIND,
          },
        });

        expect(filesBeforeDelete.total).to.be(2);

        await bulkDeleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: [fileInfo1.create.file.id, fileInfo2.create.file.id],
        });

        const filesAfterDelete = await listFiles({
          supertest,
          params: {
            kind: SECURITY_SOLUTION_FILE_KIND,
          },
        });

        expect(filesAfterDelete.total).to.be(0);
      });
    });

    describe('deletes files when there are case attachments', () => {
      afterEach(async () => {
        await deleteAllFiles({
          supertest,
        });
        await deleteAllCaseItems(es);
      });

      it('deletes the attachment even when the file does not exist', async () => {
        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({ owner: 'securitySolution' })
        );

        const caseWithAttachments = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            getFilesAttachmentReq({
              externalReferenceId: 'abc',
              owner: 'securitySolution',
            }),
          ],
        });

        await bulkDeleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: ['abc'],
        });

        await getComment({
          supertest,
          caseId: postedCase.id,
          commentId: caseWithAttachments.comments![0].id,
          expectedHttpCode: 404,
        });
      });

      it('deletes a single file', async () => {
        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({ owner: 'securitySolution' })
        );

        const { create } = await createAndUploadFile({
          supertest,
          createFileParams: {
            name: 'testfile',
            kind: SECURITY_SOLUTION_FILE_KIND,
            mimeType: 'text/plain',
            meta: {
              caseIds: [postedCase.id],
              owner: [postedCase.owner],
            },
          },
          data: 'abc',
        });

        const filesBeforeDelete = await listFiles({
          supertest,
          params: {
            kind: SECURITY_SOLUTION_FILE_KIND,
          },
        });

        expect(filesBeforeDelete.total).to.be(1);

        const caseWithAttachments = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            getFilesAttachmentReq({
              externalReferenceId: create.file.id,
              owner: 'securitySolution',
            }),
          ],
        });

        await bulkDeleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: [create.file.id],
        });

        const filesAfterDelete = await listFiles({
          supertest,
          params: {
            kind: SECURITY_SOLUTION_FILE_KIND,
          },
        });

        expect(filesAfterDelete.total).to.be(0);

        await getComment({
          supertest,
          caseId: postedCase.id,
          commentId: caseWithAttachments.comments![0].id,
          expectedHttpCode: 404,
        });
      });

      it('deletes multiple files', async () => {
        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({ owner: 'securitySolution' }),
          200
        );

        const [fileInfo1, fileInfo2] = await Promise.all([
          createAndUploadFile({
            supertest,
            createFileParams: {
              name: 'file1',
              kind: SECURITY_SOLUTION_FILE_KIND,
              mimeType: 'text/plain',
              meta: {
                caseIds: [postedCase.id],
                owner: [postedCase.owner],
              },
            },
            data: 'abc',
          }),
          createAndUploadFile({
            supertest,
            createFileParams: {
              name: 'file2',
              kind: SECURITY_SOLUTION_FILE_KIND,
              mimeType: 'text/plain',
              meta: {
                caseIds: [postedCase.id],
                owner: [postedCase.owner],
              },
            },
            data: 'abc',
          }),
        ]);

        const filesBeforeDelete = await listFiles({
          supertest,
          params: {
            kind: SECURITY_SOLUTION_FILE_KIND,
          },
        });

        expect(filesBeforeDelete.total).to.be(2);

        const caseWithAttachments = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            getFilesAttachmentReq({
              externalReferenceId: fileInfo1.create.file.id,
              owner: 'securitySolution',
            }),
            getFilesAttachmentReq({
              externalReferenceId: fileInfo2.create.file.id,
              owner: 'securitySolution',
            }),
          ],
        });

        await bulkDeleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: [fileInfo1.create.file.id, fileInfo2.create.file.id],
        });

        const filesAfterDelete = await listFiles({
          supertest,
          params: {
            kind: SECURITY_SOLUTION_FILE_KIND,
          },
        });

        expect(filesAfterDelete.total).to.be(0);

        const bulkGetAttachmentsResponse = await bulkGetAttachments({
          supertest,
          attachmentIds: [caseWithAttachments.comments![0].id, caseWithAttachments.comments![1].id],
          caseId: postedCase.id,
        });

        expect(bulkGetAttachmentsResponse.attachments.length).to.be(0);
        expect(bulkGetAttachmentsResponse.errors[0].status).to.be(404);
        expect(bulkGetAttachmentsResponse.errors[1].status).to.be(404);
      });
    });

    describe('rbac', () => {
      after(async () => {
        await deleteAllFiles({
          supertest,
        });
        await deleteAllCaseItems(es);
      });

      for (const scenario of [
        { user: obsCasesAllUser, owner: 'observability' },
        { user: secAllUser, owner: 'securitySolution' },
        { user: casesAllUser, owner: 'cases' },
        { user: obsSecCasesAllUser, owner: 'securitySolution' },
        { user: obsSecCasesAllUser, owner: 'observability' },
      ]) {
        it(`successfully deletes a file for user ${scenario.user.username} with owner ${scenario.owner} when an attachment does not exist`, async () => {
          const caseInfo = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: scenario.owner }),
            200,
            { user: superUser, space: 'space1' }
          );

          const create = await createFile({
            supertest: supertestWithoutAuth,
            params: {
              name: 'testfile',
              kind: constructFileKindIdByOwner(scenario.owner as Owner),
              mimeType: 'text/plain',
              meta: {
                caseIds: [caseInfo.id],
                owner: [scenario.owner],
              },
            },
            auth: { user: superUser, space: 'space1' },
          });

          await bulkDeleteFileAttachments({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            fileIds: [create.file.id],
            auth: { user: scenario.user, space: 'space1' },
          });
        });

        it(`successfully deletes a file for user ${scenario.user.username} with owner ${scenario.owner} when an attachment exists`, async () => {
          const caseInfo = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: scenario.owner }),
            200,
            { user: superUser, space: 'space1' }
          );

          const create = await createFile({
            supertest: supertestWithoutAuth,
            params: {
              name: 'testfile',
              kind: constructFileKindIdByOwner(scenario.owner as Owner),
              mimeType: 'text/plain',
              meta: {
                caseIds: [caseInfo.id],
                owner: [scenario.owner],
              },
            },
            auth: { user: superUser, space: 'space1' },
          });

          await bulkCreateAttachments({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            params: [
              getFilesAttachmentReq({
                externalReferenceId: create.file.id,
                owner: scenario.owner,
              }),
            ],
            auth: { user: superUser, space: 'space1' },
          });

          await bulkDeleteFileAttachments({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            fileIds: [create.file.id],
            auth: { user: scenario.user, space: 'space1' },
          });
        });
      }

      for (const scenario of [
        {
          user: obsCasesAllUser,
          owner: 'securitySolution',
        },
        {
          user: globalRead,
          owner: 'securitySolution',
        },
        {
          user: secReadUser,
          owner: 'securitySolution',
        },
        {
          user: obsCasesReadUser,
          owner: 'securitySolution',
        },
        {
          user: obsSecCasesReadUser,
          owner: 'securitySolution',
        },
        {
          user: noKibanaPrivileges,
          owner: 'securitySolution',
        },
        { user: secAllUser, owner: 'observability' },
      ]) {
        // these tests should fail when checking if the user is authorized to delete a file with the file kind
        it(`returns a 403 for user ${scenario.user.username} when attempting to delete a file with owner ${scenario.owner} that does not have an attachment`, async () => {
          const postedSecCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: scenario.owner }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          );

          const create = await createFile({
            supertest: supertestWithoutAuth,
            params: {
              name: 'testfile',
              kind: constructFileKindIdByOwner(scenario.owner as Owner),
              mimeType: 'text/plain',
              meta: {
                caseIds: [postedSecCase.id],
                owner: [scenario.owner],
              },
            },
            auth: { user: superUser, space: 'space1' },
          });

          await bulkDeleteFileAttachments({
            supertest: supertestWithoutAuth,
            caseId: postedSecCase.id,
            fileIds: [create.file.id],
            auth: { user: scenario.user, space: 'space1' },
            expectedHttpCode: 403,
          });
        });
      }

      for (const scenario of [
        {
          user: obsCasesAllUser,
          fileOwner: 'observability',
          attachmentOwner: 'securitySolution',
        },
        {
          user: globalRead,
          fileOwner: 'securitySolution',
          attachmentOwner: 'securitySolution',
        },
        {
          user: secReadUser,
          fileOwner: 'securitySolution',
          attachmentOwner: 'securitySolution',
        },
        {
          user: obsCasesReadUser,
          fileOwner: 'observability',
          attachmentOwner: 'securitySolution',
        },
        {
          user: obsSecCasesReadUser,
          fileOwner: 'observability',
          attachmentOwner: 'securitySolution',
        },
        {
          user: noKibanaPrivileges,
          fileOwner: 'securitySolution',
          attachmentOwner: 'securitySolution',
        },
        {
          user: secAllUser,
          fileOwner: 'securitySolution',
          attachmentOwner: 'observability',
        },
      ]) {
        // these tests should fail when checking the user is authorized for the attachment's owner so the user will have
        // access to delete the file saved object but not the attachment
        it(`returns a 403 for user ${scenario.user.username} when attempting to delete a file when the attachment has owner ${scenario.attachmentOwner}`, async () => {
          const caseInfo = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: scenario.attachmentOwner }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          );

          const create = await createFile({
            supertest: supertestWithoutAuth,
            params: {
              name: 'testfile',
              kind: constructFileKindIdByOwner(scenario.fileOwner as Owner),
              mimeType: 'text/plain',
              meta: {
                caseIds: [caseInfo.id],
                owner: [scenario.fileOwner],
              },
            },
            auth: { user: superUser, space: 'space1' },
          });

          await bulkCreateAttachments({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            params: [
              getFilesAttachmentReq({
                externalReferenceId: create.file.id,
                owner: scenario.attachmentOwner,
              }),
            ],
            auth: { user: superUser, space: 'space1' },
          });

          await bulkDeleteFileAttachments({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            fileIds: [create.file.id],
            auth: { user: scenario.user, space: 'space1' },
            expectedHttpCode: 403,
          });
        });
      }

      it('returns a 403 when attempting to delete files from a space the user does not have permissions to', async () => {
        const postedSecCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolution' }),
          200,
          {
            user: superUser,
            space: 'space2',
          }
        );

        const create = await createFile({
          supertest: supertestWithoutAuth,
          params: {
            name: 'testfile',
            kind: constructFileKindIdByOwner('securitySolution'),
            mimeType: 'text/plain',
            meta: {
              caseIds: [postedSecCase.id],
              owner: ['securitySolution'],
            },
          },
          auth: { user: superUser, space: 'space2' },
        });

        await bulkDeleteFileAttachments({
          supertest: supertestWithoutAuth,
          caseId: postedSecCase.id,
          fileIds: [create.file.id],
          auth: { user: secAllSpace1User, space: 'space2' },
          expectedHttpCode: 403,
        });
      });
    });
  });
};
