/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ExternalReferenceAttachmentAttributes } from '@kbn/cases-plugin/common/types/domain';
import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
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
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { defaultUser, postCaseReq, postFileReq } from '../../../../common/lib/mock';
import {
  createCase,
  createFileAttachment,
  removeServerGeneratedPropertiesFromSavedObject,
  getAuthWithSuperUser,
  deleteAllCaseItems,
  superUserSpace1Auth,
  deleteAllFiles,
} from '../../../../common/lib/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();
  const caseRequest = { ...postCaseReq, owner: SECURITY_SOLUTION_OWNER };

  describe('post_file', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('happy path', () => {
      afterEach(async () => {
        await deleteAllFiles({
          supertest,
          auth: authSpace1,
        });
      });

      it('should post a file in space1', async () => {
        const postedCase = await createCase(supertest, caseRequest, 200, authSpace1);
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
        expect(fileMetadata.name).to.be('foobar');
        expect(fileMetadata.mimeType).to.be('text/plain');
        expect(fileMetadata.extension).to.be('txt');

        // updates the case correctly after adding a comment
        expect(patchedCase.totalComment).to.eql(patchedCase.comments!.length);
        expect(patchedCase.updated_by).to.eql(defaultUser);
      });
    });

    describe('unhappy path', () => {
      it('should return a 400 when posting a file without a filename', async () => {
        const postedCase = await createCase(supertest, caseRequest, 200, authSpace1);
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

        const postedCase = await createCase(supertest, caseRequest, 200, authSpace1);
        await createFileAttachment({
          supertest,
          caseId: postedCase.id,
          params: { ...postFileReq, filename: longFilename },
          auth: authSpace1,
          expectedHttpCode: 400,
        });
      });

      it('should return a 400 when posting a file with an invalid mime type', async () => {
        const postedCase = await createCase(supertest, caseRequest, 200, authSpace1);
        await createFileAttachment({
          supertest,
          caseId: postedCase.id,
          params: { ...postFileReq, filename: 'foobar.124zas' },
          auth: authSpace1,
          expectedHttpCode: 400,
        });
      });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      it('should not post a file when the user does not have permissions for that owner', async () => {
        const postedCase = await createCase(supertest, caseRequest, 200, authSpace1);

        await createFileAttachment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postFileReq,
          auth: { user: obsOnly, space: 'space1' },
          expectedHttpCode: 403,
        });
      });

      for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
        it(`User ${
          user.username
        } with role(s) ${user.roles.join()} - should not post a file`, async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            caseRequest,
            200,
            superUserSpace1Auth
          );

          await createFileAttachment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: postFileReq,
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        });
      }

      it('should not post a file in a space the user does not have permissions for', async () => {
        const postedCase = await createCase(supertestWithoutAuth, caseRequest, 200, {
          user: superUser,
          space: 'space2',
        });

        await createFileAttachment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postFileReq,
          auth: { user: secOnly, space: 'space2' },
          expectedHttpCode: 403,
        });
      });
    });
  });
};
