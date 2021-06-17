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
} from '../../../../common/lib/utils';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnlyReadSpacesAll,
  obsSecSpacesAll,
  obsSecReadSpacesAll,
  secOnlyReadSpacesAll,
  superUser,
} from '../../../../common/lib/authentication/users';
import {
  obsOnlyDefaultSpaceAuth,
  secOnlyDefaultSpaceAuth,
  superUserDefaultSpaceAuth,
  obsSecDefaultSpaceAuth,
} from '../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_cases using alertID', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    const supertestWithoutAuth = getService('supertestWithoutAuth');

    it('should return the correct case IDs', async () => {
      const [case1, case2, case3] = await Promise.all([
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, secOnlyDefaultSpaceAuth),
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, secOnlyDefaultSpaceAuth),
        createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          obsOnlyDefaultSpaceAuth
        ),
      ]);

      await Promise.all([
        createComment({
          supertest: supertestWithoutAuth,
          caseId: case1.id,
          params: postCommentAlertReq,
          auth: secOnlyDefaultSpaceAuth,
        }),
        createComment({
          supertest: supertestWithoutAuth,
          caseId: case2.id,
          params: postCommentAlertReq,
          auth: secOnlyDefaultSpaceAuth,
        }),
        createComment({
          supertest: supertestWithoutAuth,
          caseId: case3.id,
          params: { ...postCommentAlertReq, owner: 'observabilityFixture' },
          auth: obsOnlyDefaultSpaceAuth,
        }),
      ]);

      for (const scenario of [
        {
          user: globalRead,
          caseIDs: [case1.id, case2.id, case3.id],
        },
        {
          user: superUser,
          caseIDs: [case1.id, case2.id, case3.id],
        },
        { user: secOnlyReadSpacesAll, caseIDs: [case1.id, case2.id] },
        { user: obsOnlyReadSpacesAll, caseIDs: [case3.id] },
        {
          user: obsSecReadSpacesAll,
          caseIDs: [case1.id, case2.id, case3.id],
        },
      ]) {
        const res = await getCaseIDsByAlert({
          supertest: supertestWithoutAuth,
          // cast because the official type is string | string[] but the ids will always be a single value in the tests
          alertID: postCommentAlertReq.alertId as string,
          auth: {
            user: scenario.user,
            space: null,
          },
        });
        expect(res.length).to.eql(scenario.caseIDs.length);
        for (const caseID of scenario.caseIDs) {
          expect(res).to.contain(caseID);
        }
      }
    });

    it(`User ${
      noKibanaPrivileges.username
    } with role(s) ${noKibanaPrivileges.roles.join()} - should not get cases`, async () => {
      const caseInfo = await createCase(supertest, getPostCaseRequest(), 200, {
        user: superUser,
        space: null,
      });

      await createComment({
        supertest: supertestWithoutAuth,
        caseId: caseInfo.id,
        params: postCommentAlertReq,
        auth: superUserDefaultSpaceAuth,
      });

      await getCaseIDsByAlert({
        supertest: supertestWithoutAuth,
        alertID: postCommentAlertReq.alertId as string,
        auth: { user: noKibanaPrivileges, space: null },
        expectedHttpCode: 403,
      });
    });

    it('should return a 404 when attempting to access a space', async () => {
      const [case1, case2] = await Promise.all([
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, obsSecDefaultSpaceAuth),
        createCase(
          supertestWithoutAuth,
          { ...getPostCaseRequest(), owner: 'observabilityFixture' },
          200,
          obsSecDefaultSpaceAuth
        ),
      ]);

      await Promise.all([
        createComment({
          supertest: supertestWithoutAuth,
          caseId: case1.id,
          params: postCommentAlertReq,
          auth: obsSecDefaultSpaceAuth,
        }),
        createComment({
          supertest: supertestWithoutAuth,
          caseId: case2.id,
          params: { ...postCommentAlertReq, owner: 'observabilityFixture' },
          auth: obsSecDefaultSpaceAuth,
        }),
      ]);

      await getCaseIDsByAlert({
        supertest: supertestWithoutAuth,
        alertID: postCommentAlertReq.alertId as string,
        auth: { user: obsSecSpacesAll, space: 'space1' },
        query: { owner: 'securitySolutionFixture' },
        expectedHttpCode: 404,
      });
    });

    it('should respect the owner filter when have permissions', async () => {
      const [case1, case2] = await Promise.all([
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, obsSecDefaultSpaceAuth),
        createCase(
          supertestWithoutAuth,
          { ...getPostCaseRequest(), owner: 'observabilityFixture' },
          200,
          obsSecDefaultSpaceAuth
        ),
      ]);

      await Promise.all([
        createComment({
          supertest: supertestWithoutAuth,
          caseId: case1.id,
          params: postCommentAlertReq,
          auth: obsSecDefaultSpaceAuth,
        }),
        createComment({
          supertest: supertestWithoutAuth,
          caseId: case2.id,
          params: { ...postCommentAlertReq, owner: 'observabilityFixture' },
          auth: obsSecDefaultSpaceAuth,
        }),
      ]);

      const res = await getCaseIDsByAlert({
        supertest: supertestWithoutAuth,
        alertID: postCommentAlertReq.alertId as string,
        auth: obsSecDefaultSpaceAuth,
        query: { owner: 'securitySolutionFixture' },
      });

      expect(res).to.eql([case1.id]);
    });

    it('should return the correct case IDs when the owner query parameter contains unprivileged values', async () => {
      const [case1, case2] = await Promise.all([
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, obsSecDefaultSpaceAuth),
        createCase(
          supertestWithoutAuth,
          { ...getPostCaseRequest(), owner: 'observabilityFixture' },
          200,
          obsSecDefaultSpaceAuth
        ),
      ]);

      await Promise.all([
        createComment({
          supertest: supertestWithoutAuth,
          caseId: case1.id,
          params: postCommentAlertReq,
          auth: obsSecDefaultSpaceAuth,
        }),
        createComment({
          supertest: supertestWithoutAuth,
          caseId: case2.id,
          params: { ...postCommentAlertReq, owner: 'observabilityFixture' },
          auth: obsSecDefaultSpaceAuth,
        }),
      ]);

      const res = await getCaseIDsByAlert({
        supertest: supertestWithoutAuth,
        alertID: postCommentAlertReq.alertId as string,
        auth: secOnlyDefaultSpaceAuth,
        // The secOnlyDefaultSpace user does not have permissions for observability cases, so it should only return the security solution one
        query: { owner: ['securitySolutionFixture', 'observabilityFixture'] },
      });

      expect(res).to.eql([case1.id]);
    });
  });
};
