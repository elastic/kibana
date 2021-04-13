/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { AttributesTypeUser } from '../../../../../../plugins/cases/common/api';
import { CASES_URL } from '../../../../../../plugins/cases/common/constants';
import { postCaseReq, postCaseResp, postCommentUserReq } from '../../../../common/lib/mock';
import {
  deleteCasesByESQuery,
  createCase,
  getCase,
  createComment,
  removeServerGeneratedPropertiesFromCase,
  removeServerGeneratedPropertiesFromSavedObject,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_case', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
    });

    it('should return a case with no comments', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const theCase = await getCase(supertest, postedCase.id, true);

      const data = removeServerGeneratedPropertiesFromCase(theCase);
      expect(data).to.eql(postCaseResp(postedCase.id));
      expect(data.comments?.length).to.eql(0);
    });

    it('should return a case with comments', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await createComment(supertest, postedCase.id, postCommentUserReq);
      const theCase = await getCase(supertest, postedCase.id);

      const comment = removeServerGeneratedPropertiesFromSavedObject(
        theCase.comments![0] as AttributesTypeUser
      );

      expect(theCase.comments?.length).to.eql(1);
      expect(theCase.comments![0]).to.eql(comment);
    });

    it('should return a 400 when passing the includeSubCaseComments', async () => {
      const { body } = await supertest
        .get(`${CASES_URL}/case-id?includeSubCaseComments=true`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(400);

      expect(body.message).to.contain('subCaseId');
    });

    it('unhappy path - 404s when case is not there', async () => {
      await supertest.get(`${CASES_URL}/fake-id`).set('kbn-xsrf', 'true').send().expect(404);
    });
  });
};
