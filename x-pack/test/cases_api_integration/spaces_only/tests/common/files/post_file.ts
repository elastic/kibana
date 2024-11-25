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

import { nullUser, postCaseReq, postFileReq } from '../../../../common/lib/mock';
import {
  createCase,
  createFileAttachment,
  removeServerGeneratedPropertiesFromSavedObject,
  getAuthWithSuperUser,
  deleteAllCaseItems,
  deleteAllFiles,
} from '../../../../common/lib/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  // const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();

  describe('post_file', () => {
    afterEach(async () => {
      await deleteAllFiles({
        supertest: supertestWithoutAuth,
        auth: authSpace1,
      });
      await deleteAllCaseItems(es);
    });

    it('should post a file in space1', async () => {
      const postedCase = await createCase(
        supertestWithoutAuth,
        { ...postCaseReq, owner: SECURITY_SOLUTION_OWNER },
        200,
        authSpace1
      );
      const patchedCase = await createFileAttachment({
        supertest: supertestWithoutAuth,
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
      expect(patchedCase.updated_by).to.eql(nullUser);
    });

    it('should not post a file on a case in a different space', async () => {
      const postedCase = await createCase(supertestWithoutAuth, postCaseReq, 200, authSpace1);
      await createFileAttachment({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: postFileReq,
        auth: getAuthWithSuperUser('space2'),
        expectedHttpCode: 404,
      });
    });
  });
};
