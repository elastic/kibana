/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ExternalReferenceAttachmentAttributes } from '@kbn/cases-plugin/common/types/domain';
import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { defaultUser, postCaseReq, postFileReq } from '../../../../common/lib/mock';
import {
  createCase,
  createFileAttachment,
  removeServerGeneratedPropertiesFromSavedObject,
  getAuthWithSuperUser,
  deleteAllCaseItems,
} from '../../../../common/lib/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();

  describe('post_file', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('happy path', () => {
      it('should post a file in space1', async () => {
        const postedCase = await createCase(
          supertest,
          { ...postCaseReq, owner: SECURITY_SOLUTION_OWNER },
          200,
          authSpace1
        );
        const patchedCase = await createFileAttachment({
          supertest,
          caseId: postedCase.id,
          params: postFileReq,
          auth: authSpace1,
        });

        const attachedFileComment = removeServerGeneratedPropertiesFromSavedObject(
          patchedCase.comments![0]
        ) as ExternalReferenceAttachmentAttributes;
        // @ts-ignore
        const fileMetadata = attachedFileComment.externalReferenceMetadata?.files[0];

        expect(attachedFileComment.owner).to.be('securitySolution');
        expect(attachedFileComment.externalReferenceId).to.be.ok(); // truthy
        expect(attachedFileComment.externalReferenceAttachmentTypeId).to.be('.files');
        expect(attachedFileComment.externalReferenceStorage).to.eql({
          soType: 'file',
          type: 'savedObject',
        });
        expect(fileMetadata.name).to.be(postFileReq.filename);
        expect(fileMetadata.mimeType).to.be(postFileReq.mimeType);
        expect(fileMetadata.extension).to.be('txt');

        // updates the case correctly after adding a comment
        expect(patchedCase.totalComment).to.eql(patchedCase.comments!.length);
        expect(patchedCase.updated_by).to.eql(defaultUser);
      });
    });

    describe('unhappy path', () => {
      it('should return a 400 when posting a file without a filename', async () => {
        const postedCase = await createCase(supertest, postCaseReq, 200, authSpace1);
        await createFileAttachment({
          supertest,
          caseId: postedCase.id,
          params: { ...postFileReq, filename: '' },
          auth: authSpace1,
          expectedHttpCode: 400,
        });
      });

      it('should return a 400 when posting a file with a filename that is too long', async () => {
        const longFilename = Array(161).fill('a').toString();

        const postedCase = await createCase(supertest, postCaseReq, 200, authSpace1);
        await createFileAttachment({
          supertest,
          caseId: postedCase.id,
          params: { ...postFileReq, filename: longFilename },
          auth: authSpace1,
          expectedHttpCode: 400,
        });
      });

      it('should return a 400 when posting a file with an invalid mime type', async () => {
        const postedCase = await createCase(supertest, postCaseReq, 200, authSpace1);
        await createFileAttachment({
          supertest,
          caseId: postedCase.id,
          params: { ...postFileReq, mimeType: 'foo/bar' },
          auth: authSpace1,
          expectedHttpCode: 400,
        });
      });
    });
  });
};
