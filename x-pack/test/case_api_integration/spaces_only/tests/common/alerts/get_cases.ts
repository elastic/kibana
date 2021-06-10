/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { getPostCaseRequest, postCommentAlertReq } from '../../../../common/lib/mock';
import {
  createCase,
  createComment,
  getCaseIDsByAlert,
  deleteAllCaseItems,
  getAuthWithSuperUser,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();
  const authSpace2 = getAuthWithSuperUser('space2');

  describe('get_cases using alertID', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should return all cases with the same alert ID attached to them in space1', async () => {
      const [case1, case2, case3] = await Promise.all([
        createCase(supertest, getPostCaseRequest(), 200, authSpace1),
        createCase(supertest, getPostCaseRequest(), 200, authSpace1),
        createCase(supertest, getPostCaseRequest(), 200, authSpace1),
      ]);

      await Promise.all([
        createComment({
          supertest,
          caseId: case1.id,
          params: postCommentAlertReq,
          auth: authSpace1,
        }),
        createComment({
          supertest,
          caseId: case2.id,
          params: postCommentAlertReq,
          auth: authSpace1,
        }),
        createComment({
          supertest,
          caseId: case3.id,
          params: postCommentAlertReq,
          auth: authSpace1,
        }),
      ]);

      const caseIDsWithAlert = await getCaseIDsByAlert({
        supertest,
        alertID: 'test-id',
        auth: authSpace1,
      });

      expect(caseIDsWithAlert.length).to.eql(3);
      expect(caseIDsWithAlert).to.contain(case1.id);
      expect(caseIDsWithAlert).to.contain(case2.id);
      expect(caseIDsWithAlert).to.contain(case3.id);
    });

    it('should return 1 case in space2 when 2 cases were created in space1 and 1 in space2', async () => {
      const [case1, case2, case3] = await Promise.all([
        createCase(supertest, getPostCaseRequest(), 200, authSpace1),
        createCase(supertest, getPostCaseRequest(), 200, authSpace1),
        createCase(supertest, getPostCaseRequest(), 200, authSpace2),
      ]);

      await Promise.all([
        createComment({
          supertest,
          caseId: case1.id,
          params: postCommentAlertReq,
          auth: authSpace1,
        }),
        createComment({
          supertest,
          caseId: case2.id,
          params: postCommentAlertReq,
          auth: authSpace1,
        }),
        createComment({
          supertest,
          caseId: case3.id,
          params: postCommentAlertReq,
          auth: authSpace2,
        }),
      ]);

      const caseIDsWithAlert = await getCaseIDsByAlert({
        supertest,
        alertID: 'test-id',
        auth: authSpace2,
      });

      expect(caseIDsWithAlert.length).to.eql(1);
      expect(caseIDsWithAlert).to.eql([case3.id]);
    });
  });
};
