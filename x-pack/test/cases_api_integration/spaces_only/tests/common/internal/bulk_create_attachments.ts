/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AttributesTypeUser } from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { nullUser, postCaseReq, postCommentUserReq } from '../../../../common/lib/mock';
import {
  createCase,
  removeServerGeneratedPropertiesFromSavedObject,
  getAuthWithSuperUser,
  bulkCreateAttachments,
  deleteAllCaseItems,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();

  describe('bulk_create_attachments', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should bulk create attachments in space1', async () => {
      const postedCase = await createCase(supertestWithoutAuth, postCaseReq, 200, authSpace1);
      const patchedCase = await bulkCreateAttachments({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: [postCommentUserReq],
        auth: authSpace1,
      });

      const comment = removeServerGeneratedPropertiesFromSavedObject(
        patchedCase.comments![0] as AttributesTypeUser
      );

      expect(comment).to.eql({
        type: postCommentUserReq.type,
        comment: postCommentUserReq.comment,
        created_by: nullUser,
        pushed_at: null,
        pushed_by: null,
        updated_by: null,
        owner: 'securitySolutionFixture',
      });

      // updates the case correctly after adding a comment
      expect(patchedCase.totalComment).to.eql(patchedCase.comments!.length);
      expect(patchedCase.updated_by).to.eql(nullUser);
    });

    it('should not post a comment on a case in a different space', async () => {
      const postedCase = await createCase(supertestWithoutAuth, postCaseReq, 200, authSpace1);
      await bulkCreateAttachments({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: [postCommentUserReq],
        auth: getAuthWithSuperUser('space2'),
        expectedHttpCode: 404,
      });
    });
  });
};
