/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CaseResponse, SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { constructFileKindIdByOwner } from '@kbn/cases-plugin/common/constants';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  createAndUploadFile,
  createCase,
  deleteAllCaseItems,
  deleteAllFiles,
  deleteFileAttachments,
  listFiles,
} from '../../../../common/lib/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  const secFileKind = constructFileKindIdByOwner(SECURITY_SOLUTION_OWNER);

  describe.only('delete_file_attachments', () => {
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

      it('fails to delete a file when the owner is not within the metadata', async () => {
        const { create } = await createAndUploadFile({
          supertest,
          createFileParams: {
            name: 'testfile',
            kind: secFileKind,
            mimeType: 'text/plain',
            meta: {
              caseId: postedCase.id,
              // missing the owner here
            },
          },
          data: 'abc',
        });

        await deleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: [create.file.id],
          expectedHttpCode: 400,
        });
      });

      it('fails to delete a file when the case id is not within the metadata', async () => {
        const { create } = await createAndUploadFile({
          supertest,
          createFileParams: {
            name: 'testfile',
            kind: secFileKind,
            mimeType: 'text/plain',
            meta: {
              owner: [postedCase.owner],
            },
          },
          data: 'abc',
        });

        await deleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: [create.file.id],
          expectedHttpCode: 400,
        });
      });

      it('fails to delete a file when the owner is not formatted as an array of strings', async () => {
        const { create } = await createAndUploadFile({
          supertest,
          createFileParams: {
            name: 'testfile',
            kind: secFileKind,
            mimeType: 'text/plain',
            meta: {
              caseId: postedCase.id,
              owner: postedCase.owner,
            },
          },
          data: 'abc',
        });

        await deleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: [create.file.id],
          expectedHttpCode: 400,
        });
      });

      it('fails to delete a file when the case id does not match the id in the request', async () => {
        const { create } = await createAndUploadFile({
          supertest,
          createFileParams: {
            name: 'testfile',
            kind: secFileKind,
            mimeType: 'text/plain',
            meta: {
              caseId: 'abc',
              owner: [postedCase.owner],
            },
          },
          data: 'abc',
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
            kind: secFileKind,
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
            kind: secFileKind,
          },
        });

        expect(filesBeforeDelete.total).to.be(1);

        await deleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: [create.file.id],
          expectedHttpCode: 204,
        });

        const filesAfterDelete = await listFiles({
          supertest,
          params: {
            kind: secFileKind,
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
              kind: secFileKind,
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
              kind: secFileKind,
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
            kind: secFileKind,
          },
        });

        expect(filesBeforeDelete.total).to.be(2);

        await deleteFileAttachments({
          supertest,
          caseId: postedCase.id,
          fileIds: [fileInfo1.create.file.id, fileInfo2.create.file.id],
          expectedHttpCode: 204,
        });

        const filesAfterDelete = await listFiles({
          supertest,
          params: {
            kind: secFileKind,
          },
        });

        expect(filesAfterDelete.total).to.be(0);
      });
    });
  });
};
