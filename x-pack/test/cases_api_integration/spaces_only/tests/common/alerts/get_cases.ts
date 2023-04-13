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
  getCasesByAlert,
  deleteAllCaseItems,
  getAuthWithSuperUser,
} from '../../../../common/lib/api';
import { validateCasesFromAlertIDResponse } from '../../../../common/lib/validation';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();
  const authSpace2 = getAuthWithSuperUser('space2');

  describe('get_cases using alertID', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should return all cases with the same alert ID attached to them in space1', async () => {
      const [case1, case2, case3] = await Promise.all([
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, authSpace1),
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, authSpace1),
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, authSpace1),
      ]);

      await Promise.all([
        createComment({
          supertest: supertestWithoutAuth,
          caseId: case1.id,
          params: postCommentAlertReq,
          auth: authSpace1,
        }),
        createComment({
          supertest: supertestWithoutAuth,
          caseId: case2.id,
          params: postCommentAlertReq,
          auth: authSpace1,
        }),
        createComment({
          supertest: supertestWithoutAuth,
          caseId: case3.id,
          params: postCommentAlertReq,
          auth: authSpace1,
        }),
      ]);

      const cases = await getCasesByAlert({
        supertest: supertestWithoutAuth,
        alertID: 'test-id',
        auth: authSpace1,
      });

      expect(cases.length).to.eql(3);
      validateCasesFromAlertIDResponse(cases, [
        { caseInfo: case1, totals: { alerts: 1, userComments: 0 } },
        { caseInfo: case2, totals: { alerts: 1, userComments: 0 } },
        { caseInfo: case3, totals: { alerts: 1, userComments: 0 } },
      ]);
    });

    it('should return 1 case in space2 when 2 cases were created in space1 and 1 in space2', async () => {
      const [case1, case2, case3] = await Promise.all([
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, authSpace1),
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, authSpace1),
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, authSpace2),
      ]);

      await Promise.all([
        createComment({
          supertest: supertestWithoutAuth,
          caseId: case1.id,
          params: postCommentAlertReq,
          auth: authSpace1,
        }),
        createComment({
          supertest: supertestWithoutAuth,
          caseId: case2.id,
          params: postCommentAlertReq,
          auth: authSpace1,
        }),
        createComment({
          supertest: supertestWithoutAuth,
          caseId: case3.id,
          params: postCommentAlertReq,
          auth: authSpace2,
        }),
      ]);

      const casesByAlert = await getCasesByAlert({
        supertest: supertestWithoutAuth,
        alertID: 'test-id',
        auth: authSpace2,
      });

      expect(casesByAlert.length).to.eql(1);
      expect(casesByAlert).to.eql([
        {
          id: case3.id,
          title: case3.title,
          description: case3.description,
          status: case3.status,
          createdAt: case3.created_at,
          totals: {
            userComments: 0,
            alerts: 1,
          },
        },
      ]);
    });
  });
};
