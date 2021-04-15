/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { postCaseReq, postCommentUserReq } from '../../../../common/lib/mock';
import {
  createCaseAction,
  createSubCase,
  deleteAllCaseItems,
  deleteCaseAction,
  createCase,
  createComment,
  getComment,
} from '../../../../common/lib/utils';
import { CommentType } from '../../../../../../plugins/cases/common/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_comment', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should get a comment', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment(supertest, postedCase.id, postCommentUserReq);
      const comment = await getComment(supertest, postedCase.id, patchedCase.comments![0].id);

      expect(comment).to.eql(patchedCase.comments![0]);
    });

    it('unhappy path - 404s when comment is not there', async () => {
      await getComment(supertest, 'fake-id', 'fake-id', 404);
    });

    // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
    describe.skip('sub cases', () => {
      let actionID: string;
      before(async () => {
        actionID = await createCaseAction({ supertest });
      });
      after(async () => {
        await deleteCaseAction({ supertest, id: actionID });
      });
      it('should get a sub case comment', async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });
        const comment = await getComment(supertest, caseInfo.id, caseInfo.comments![0].id);
        expect(comment.type).to.be(CommentType.generatedAlert);
      });
    });
  });
};
