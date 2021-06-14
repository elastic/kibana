/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../../plugins/cases/common/constants';
import { getPostCaseRequest, postCommentAlertReq } from '../../../../common/lib/mock';
import {
  createCase,
  createComment,
  getCaseIDsByAlert,
  deleteAllCaseItems,
} from '../../../../common/lib/utils';
import { CaseResponse } from '../../../../../../plugins/cases/common';
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

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_cases using alertID', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should return all cases with the same alert ID attached to them', async () => {
      const [case1, case2, case3] = await Promise.all([
        createCase(supertest, getPostCaseRequest()),
        createCase(supertest, getPostCaseRequest()),
        createCase(supertest, getPostCaseRequest()),
      ]);

      await Promise.all([
        createComment({ supertest, caseId: case1.id, params: postCommentAlertReq }),
        createComment({ supertest, caseId: case2.id, params: postCommentAlertReq }),
        createComment({ supertest, caseId: case3.id, params: postCommentAlertReq }),
      ]);

      const caseIDsWithAlert = await getCaseIDsByAlert({ supertest, alertID: 'test-id' });

      expect(caseIDsWithAlert.length).to.eql(3);
      expect(caseIDsWithAlert).to.contain(case1.id);
      expect(caseIDsWithAlert).to.contain(case2.id);
      expect(caseIDsWithAlert).to.contain(case3.id);
    });

    it('should return all cases with the same alert ID when more than 100 cases', async () => {
      // if there are more than 100 responses, the implementation sets the aggregation size to the
      // specific value
      const numCases = 102;
      const createCasePromises: Array<Promise<CaseResponse>> = [];
      for (let i = 0; i < numCases; i++) {
        createCasePromises.push(createCase(supertest, getPostCaseRequest()));
      }

      const cases = await Promise.all(createCasePromises);

      const commentPromises: Array<Promise<CaseResponse>> = [];
      for (const caseInfo of cases) {
        commentPromises.push(
          createComment({ supertest, caseId: caseInfo.id, params: postCommentAlertReq })
        );
      }

      await Promise.all(commentPromises);

      const caseIDsWithAlert = await getCaseIDsByAlert({ supertest, alertID: 'test-id' });

      expect(caseIDsWithAlert.length).to.eql(numCases);

      for (const caseInfo of cases) {
        expect(caseIDsWithAlert).to.contain(caseInfo.id);
      }
    });

    it('should return no cases when the alert ID is not found', async () => {
      const [case1, case2, case3] = await Promise.all([
        createCase(supertest, getPostCaseRequest()),
        createCase(supertest, getPostCaseRequest()),
        createCase(supertest, getPostCaseRequest()),
      ]);

      await Promise.all([
        createComment({ supertest, caseId: case1.id, params: postCommentAlertReq }),
        createComment({ supertest, caseId: case2.id, params: postCommentAlertReq }),
        createComment({ supertest, caseId: case3.id, params: postCommentAlertReq }),
      ]);

      const caseIDsWithAlert = await getCaseIDsByAlert({ supertest, alertID: 'test-id100' });

      expect(caseIDsWithAlert.length).to.eql(0);
    });

    it('should return no cases when the owner filters them out', async () => {
      const [case1, case2, case3] = await Promise.all([
        createCase(supertest, getPostCaseRequest()),
        createCase(supertest, getPostCaseRequest()),
        createCase(supertest, getPostCaseRequest()),
      ]);

      await Promise.all([
        createComment({ supertest, caseId: case1.id, params: postCommentAlertReq }),
        createComment({ supertest, caseId: case2.id, params: postCommentAlertReq }),
        createComment({ supertest, caseId: case3.id, params: postCommentAlertReq }),
      ]);

      const caseIDsWithAlert = await getCaseIDsByAlert({
        supertest,
        alertID: 'test-id',
        query: { owner: 'not-real' },
      });

      expect(caseIDsWithAlert.length).to.eql(0);
    });

    it('should return a 302 when passing an empty alertID', async () => {
      // kibana returns a 302 instead of a 400 when a url param is missing
      await supertest.get(`${CASES_URL}/alerts/`).expect(302);
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      it('should return the correct case IDs', async () => {
        const secOnlyAuth = { user: secOnly, space: 'space1' };
        const obsOnlyAuth = { user: obsOnly, space: 'space1' };

        const [case1, case2, case3] = await Promise.all([
          createCase(supertestWithoutAuth, getPostCaseRequest(), 200, secOnlyAuth),
          createCase(supertestWithoutAuth, getPostCaseRequest(), 200, secOnlyAuth),
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            obsOnlyAuth
          ),
        ]);

        await Promise.all([
          createComment({
            supertest: supertestWithoutAuth,
            caseId: case1.id,
            params: postCommentAlertReq,
            auth: secOnlyAuth,
          }),
          createComment({
            supertest: supertestWithoutAuth,
            caseId: case2.id,
            params: postCommentAlertReq,
            auth: secOnlyAuth,
          }),
          createComment({
            supertest: supertestWithoutAuth,
            caseId: case3.id,
            params: { ...postCommentAlertReq, owner: 'observabilityFixture' },
            auth: obsOnlyAuth,
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
          { user: secOnlyRead, caseIDs: [case1.id, case2.id] },
          { user: obsOnlyRead, caseIDs: [case3.id] },
          {
            user: obsSecRead,
            caseIDs: [case1.id, case2.id, case3.id],
          },
        ]) {
          const res = await getCaseIDsByAlert({
            supertest: supertestWithoutAuth,
            // cast because the official type is string | string[] but the ids will always be a single value in the tests
            alertID: postCommentAlertReq.alertId as string,
            auth: {
              user: scenario.user,
              space: 'space1',
            },
          });
          expect(res.length).to.eql(scenario.caseIDs.length);
          for (const caseID of scenario.caseIDs) {
            expect(res).to.contain(caseID);
          }
        }
      });

      for (const scenario of [
        { user: noKibanaPrivileges, space: 'space1' },
        { user: secOnly, space: 'space2' },
      ]) {
        it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
          scenario.space
        } - should not get cases`, async () => {
          const caseInfo = await createCase(supertest, getPostCaseRequest(), 200, {
            user: superUser,
            space: scenario.space,
          });

          await createComment({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            params: postCommentAlertReq,
            auth: { user: superUser, space: scenario.space },
          });

          await getCaseIDsByAlert({
            supertest: supertestWithoutAuth,
            alertID: postCommentAlertReq.alertId as string,
            auth: { user: scenario.user, space: scenario.space },
            expectedHttpCode: 403,
          });
        });
      }

      it('should respect the owner filter when have permissions', async () => {
        const auth = { user: obsSec, space: 'space1' };
        const [case1, case2] = await Promise.all([
          createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth),
          createCase(
            supertestWithoutAuth,
            { ...getPostCaseRequest(), owner: 'observabilityFixture' },
            200,
            auth
          ),
        ]);

        await Promise.all([
          createComment({
            supertest: supertestWithoutAuth,
            caseId: case1.id,
            params: postCommentAlertReq,
            auth,
          }),
          createComment({
            supertest: supertestWithoutAuth,
            caseId: case2.id,
            params: { ...postCommentAlertReq, owner: 'observabilityFixture' },
            auth,
          }),
        ]);

        const res = await getCaseIDsByAlert({
          supertest: supertestWithoutAuth,
          alertID: postCommentAlertReq.alertId as string,
          auth,
          query: { owner: 'securitySolutionFixture' },
        });

        expect(res).to.eql([case1.id]);
      });

      it('should return the correct case IDs when the owner query parameter contains unprivileged values', async () => {
        const auth = { user: obsSec, space: 'space1' };
        const [case1, case2] = await Promise.all([
          createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth),
          createCase(
            supertestWithoutAuth,
            { ...getPostCaseRequest(), owner: 'observabilityFixture' },
            200,
            auth
          ),
        ]);

        await Promise.all([
          createComment({
            supertest: supertestWithoutAuth,
            caseId: case1.id,
            params: postCommentAlertReq,
            auth,
          }),
          createComment({
            supertest: supertestWithoutAuth,
            caseId: case2.id,
            params: { ...postCommentAlertReq, owner: 'observabilityFixture' },
            auth,
          }),
        ]);

        const res = await getCaseIDsByAlert({
          supertest: supertestWithoutAuth,
          alertID: postCommentAlertReq.alertId as string,
          auth: { user: secOnly, space: 'space1' },
          // The secOnly user does not have permissions for observability cases, so it should only return the security solution one
          query: { owner: ['securitySolutionFixture', 'observabilityFixture'] },
        });

        expect(res).to.eql([case1.id]);
      });
    });
  });
};
