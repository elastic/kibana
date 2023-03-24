/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CaseResponse } from '@kbn/cases-plugin/common';
import { getFilesAttachmentReq, getPostCaseRequest } from '../../../../common/lib/mock';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  bulkCreateAttachments,
  createAndUploadFile,
  createCase,
  createFile,
  deleteAllCaseItems,
  deleteAllFiles,
  deleteFileAttachments,
  listFiles,
} from '../../../../common/lib/api';
import { SECURITY_SOLUTION_FILE_KIND } from '../../../../common/lib/constants';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnly,
  obsOnlyRead,
  obsSec,
  obsSecRead,
  secOnly,
  secOnlyRead,
  secOnlyReadDelete,
  superUser,
} from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('delete_file_attachments', () => {
    describe('failures', () => {
      let postedCase: CaseResponse;

      before(async () => {
        postedCase = await createCase(supertest, getPostCaseRequest());
      });

      after(async () => {
        await deleteAllFiles({
          supertest,
        });
        await deleteAllCaseItems(es);
      });

      it('fails to delete a file when the file does not exist', async () => {
        await deleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: ['abc'],
          expectedHttpCode: 500,
        });
      });

      it('fails to delete a file when the owner is not within the metadata', async () => {
        const create = await createFile({
          supertest,
          params: {
            name: 'testfile',
            kind: SECURITY_SOLUTION_FILE_KIND,
            mimeType: 'text/plain',
            meta: {
              caseId: postedCase.id,
              // missing the owner here
            },
          },
        });

        await deleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: [create.file.id],
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

        await deleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: [create.file.id],
          expectedHttpCode: 400,
        });
      });

      it('fails to delete a file when the owner is not formatted as an array of strings', async () => {
        const create = await createFile({
          supertest,
          params: {
            name: 'testfile',
            kind: SECURITY_SOLUTION_FILE_KIND,
            mimeType: 'text/plain',
            meta: {
              caseId: postedCase.id,
              owner: postedCase.owner,
            },
          },
        });

        await deleteFileAttachments({
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
              caseId: 'abc',
              owner: [postedCase.owner],
            },
          },
        });

        await deleteFileAttachments({
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

      it('deletes a single file', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        const { create } = await createAndUploadFile({
          supertest,
          createFileParams: {
            name: 'testfile',
            kind: SECURITY_SOLUTION_FILE_KIND,
            mimeType: 'text/plain',
            meta: {
              caseId: postedCase.id,
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

        await deleteFileAttachments({
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
                caseId: postedCase.id,
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
                caseId: postedCase.id,
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

        await deleteFileAttachments({
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

    /**
     * For these tests the fixture plugins don't have a registered file kind so they relying on the actual owner
     * that corresponds to them (i.e. securitySolutionFixture -> securitySolution). Or in some cases it doesn't matter
     * and they just default to securitySolution since the requests for creating/uploading the file are done using supertest
     * as the super user. The calls that matter are when creating the file attachment comments and the deletion call. Those
     * users/owners need to match (or not if it's testing for a 403)
     */
    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      after(async () => {
        await deleteAllFiles({
          supertest,
        });
        await deleteAllCaseItems(es);
      });

      for (const scenario of [
        { user: obsOnly, owner: 'observabilityFixture' },
        { user: secOnly, owner: 'securitySolutionFixture' },
        { user: secOnlyReadDelete, owner: 'securitySolutionFixture' },
        { user: obsSec, owner: 'securitySolutionFixture' },
        { user: obsSec, owner: 'observabilityFixture' },
      ]) {
        it(`successfully deletes a file for user ${scenario.user.username} with owner ${scenario.owner} when an attachment does not exist`, async () => {
          const caseInfo = await createCase(
            supertest,
            getPostCaseRequest({ owner: scenario.owner })
          );

          const create = await createFile({
            supertest: supertestWithoutAuth,
            params: {
              name: 'testfile',
              kind: SECURITY_SOLUTION_FILE_KIND,
              mimeType: 'text/plain',
              meta: {
                caseId: caseInfo.id,
                owner: [scenario.owner],
              },
            },
            auth: { user: superUser, space: 'space1' },
          });

          await deleteFileAttachments({
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
              kind: SECURITY_SOLUTION_FILE_KIND,
              mimeType: 'text/plain',
              meta: {
                caseId: caseInfo.id,
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

          await deleteFileAttachments({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            fileIds: [create.file.id],
            auth: { user: scenario.user, space: 'space1' },
          });
        });
      }

      for (const scenario of [
        { user: obsOnly, owner: 'securitySolutionFixture' },
        { user: globalRead, owner: 'securitySolutionFixture' },
        { user: secOnlyRead, owner: 'securitySolutionFixture' },
        { user: obsOnlyRead, owner: 'securitySolutionFixture' },
        { user: obsSecRead, owner: 'securitySolutionFixture' },
        { user: noKibanaPrivileges, owner: 'securitySolutionFixture' },
        { user: secOnly, owner: 'observabilityFixture' },
      ]) {
        it(`returns a 403 for user ${scenario.user.username} when attempting to delete a file with owner ${scenario.owner} that does not have an attachment`, async () => {
          const postedSecCase = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
            user: superUser,
            space: 'space1',
          });

          const create = await createFile({
            supertest: supertestWithoutAuth,
            params: {
              name: 'testfile',
              kind: SECURITY_SOLUTION_FILE_KIND,
              mimeType: 'text/plain',
              meta: {
                caseId: postedSecCase.id,
                owner: [scenario.owner],
              },
            },
            auth: { user: superUser, space: 'space1' },
          });

          await deleteFileAttachments({
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
          user: obsOnly,
          fileOwner: 'observabilityFixture',
          attachmentOwner: 'securitySolutionFixture',
        },
        {
          user: globalRead,
          fileOwner: 'securitySolutionFixture',
          attachmentOwner: 'securitySolutionFixture',
        },
        {
          user: secOnlyRead,
          fileOwner: 'securitySolutionFixture',
          attachmentOwner: 'securitySolutionFixture',
        },
        {
          user: obsOnlyRead,
          fileOwner: 'observabilityFixture',
          attachmentOwner: 'securitySolutionFixture',
        },
        {
          user: obsSecRead,
          fileOwner: 'observabilityFixture',
          attachmentOwner: 'securitySolutionFixture',
        },
        {
          user: noKibanaPrivileges,
          fileOwner: 'securitySolutionFixture',
          attachmentOwner: 'securitySolutionFixture',
        },
        {
          user: secOnly,
          fileOwner: 'securitySolutionFixture',
          attachmentOwner: 'observabilityFixture',
        },
      ]) {
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
              kind: SECURITY_SOLUTION_FILE_KIND,
              mimeType: 'text/plain',
              meta: {
                caseId: caseInfo.id,
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

          await deleteFileAttachments({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            fileIds: [create.file.id],
            auth: { user: scenario.user, space: 'space1' },
            expectedHttpCode: 403,
          });
        });
      }
    });
  });
};
