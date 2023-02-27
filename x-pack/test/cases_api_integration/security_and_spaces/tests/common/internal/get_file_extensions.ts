/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
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

import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  bulkCreateAttachments,
  createCase,
  createComment,
  deleteAllCaseItems,
  getFileExtensions,
} from '../../../../common/lib/api';
import {
  fileAttachmentMetadata,
  getFilesAttachmentReq,
  getPostCaseRequest,
  postCommentUserReq,
} from '../../../../common/lib/mock';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_file_extensions', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('create a single case', () => {
      let caseId: string;

      beforeEach(async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        caseId = postedCase.id;
      });

      it('returns no extensions when no files are attached to the case', async () => {
        await createComment({
          supertest,
          caseId,
          params: postCommentUserReq,
        });

        const extensionsResult = await getFileExtensions({
          supertest,
          caseId,
        });

        expect(extensionsResult.total).to.be(0);
        expect(extensionsResult.extensions).to.eql([]);
      });

      it('returns 1 png extension', async () => {
        await bulkCreateAttachments({
          supertest,
          caseId,
          params: [postCommentUserReq, getFilesAttachmentReq()],
        });

        const extensionsResult = await getFileExtensions({
          supertest,
          caseId,
        });

        expect(extensionsResult.total).to.be(1);
        expect(extensionsResult.extensions).to.eql([{ value: 'png', total: 1 }]);
      });

      it('returns a single png entry with a total of 3 when 3 png entries exist', async () => {
        await bulkCreateAttachments({
          supertest,
          caseId,
          params: [
            postCommentUserReq,
            getFilesAttachmentReq(),
            getFilesAttachmentReq(),
            getFilesAttachmentReq(),
          ],
        });

        const extensionsResult = await getFileExtensions({
          supertest,
          caseId,
        });

        expect(extensionsResult.total).to.be(1);
        expect(extensionsResult.extensions).to.eql([{ value: 'png', total: 3 }]);
      });

      it('returns entries for png and jpeg', async () => {
        await bulkCreateAttachments({
          supertest,
          caseId,
          params: [
            postCommentUserReq,
            getFilesAttachmentReq(),
            getFilesAttachmentReq({
              externalReferenceMetadata: {
                file: {
                  ...fileAttachmentMetadata.file,
                  extension: 'jpeg',
                },
              },
            }),
          ],
        });

        const extensionsResult = await getFileExtensions({
          supertest,
          caseId,
        });

        expect(extensionsResult.total).to.be(2);
        expect(extensionsResult.extensions).to.eql([
          { value: 'jpeg', total: 1 },
          { value: 'png', total: 1 },
        ]);
      });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      it('should retrieve the file extensions for a case', async () => {
        const postedCase = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
          user: superUser,
          space: 'space1',
        });

        await bulkCreateAttachments({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: [postCommentUserReq, getFilesAttachmentReq()],
          auth: { user: superUser, space: 'space1' },
        });

        for (const user of [globalRead, superUser, secOnly, secOnlyRead, obsSec, obsSecRead]) {
          const extensionsResult = await getFileExtensions({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            auth: { user, space: 'space1' },
          });

          expect(extensionsResult.total).to.be(1);
          expect(extensionsResult.extensions).to.eql([{ value: 'png', total: 1 }]);
        }
      });

      it('should not retrieve the file extensions for a case', async () => {
        const postedCase = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
          user: superUser,
          space: 'space1',
        });

        await bulkCreateAttachments({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: [postCommentUserReq, getFilesAttachmentReq()],
          auth: { user: superUser, space: 'space1' },
        });

        for (const user of [noKibanaPrivileges, obsOnly, obsOnlyRead]) {
          await getFileExtensions({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        }
      });

      it('should not retrieve the file extensions for a case when the user does not have permissions to the space', async () => {
        const postedCase = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
          user: superUser,
          space: 'space2',
        });

        await getFileExtensions({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          auth: { user: secOnly, space: 'space2' },
          expectedHttpCode: 403,
        });
      });
    });
  });
};
