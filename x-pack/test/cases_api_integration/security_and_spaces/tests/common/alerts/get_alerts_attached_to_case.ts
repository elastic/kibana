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
  deleteAllCaseItems,
  getAlertsAttachedToCase,
} from '../../../../common/lib/utils';
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

  describe('get all alerts attach to a case', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should return all alerts for the specified case id', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest());

      await createComment({ supertest, caseId: theCase.id, params: postCommentAlertReq });
      const updatedCase = await createComment({
        supertest,
        caseId: theCase.id,
        params: { ...postCommentAlertReq, alertId: 'test-id-2', index: 'test-index-2' },
      });

      const alerts = await getAlertsAttachedToCase({ supertest, caseId: theCase.id });
      expect(alerts).to.eql([
        {
          id: 'test-id',
          index: 'test-index',
          attached_at: updatedCase.comments![0].created_at,
        },
        {
          id: 'test-id-2',
          index: 'test-index-2',
          attached_at: updatedCase.comments![1].created_at,
        },
      ]);
    });

    it('should return a 404 when case does not exist', async () => {
      await getAlertsAttachedToCase({ supertest, caseId: 'not-exists', expectedHttpCode: 404 });
    });

    it('should return a 404 when case id is empty', async () => {
      await getAlertsAttachedToCase({ supertest, caseId: '', expectedHttpCode: 404 });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      it('should return the correct alert', async () => {
        const secOnlyAuth = { user: secOnly, space: 'space1' };
        const obsOnlyAuth = { user: obsOnly, space: 'space1' };

        const [case1, case2] = await Promise.all([
          createCase(supertestWithoutAuth, getPostCaseRequest(), 200, secOnlyAuth),
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            obsOnlyAuth
          ),
        ]);

        const [case2WithComments] = await Promise.all([
          createComment({
            supertest: supertestWithoutAuth,
            caseId: case2.id,
            params: { ...postCommentAlertReq, alertId: 'test-id-3', owner: 'observabilityFixture' },
            auth: obsOnlyAuth,
          }),
          createComment({
            supertest: supertestWithoutAuth,
            caseId: case1.id,
            params: postCommentAlertReq,
            auth: secOnlyAuth,
          }),
        ]);

        // This call cannot be made inside the Promise.all call
        // as there will be a race condition between the two calls
        // and a 409 version conflict will be thrown
        const case1WithComments = await createComment({
          supertest: supertestWithoutAuth,
          caseId: case1.id,
          params: { ...postCommentAlertReq, alertId: 'test-id-2' },
          auth: secOnlyAuth,
        });

        for (const scenario of [
          {
            user: globalRead,
            cases: [
              { theCase: case1WithComments, expectedAlerts: ['test-id', 'test-id-2'] },
              { theCase: case2WithComments, expectedAlerts: ['test-id-3'] },
            ],
          },
          {
            user: superUser,
            cases: [
              { theCase: case1WithComments, expectedAlerts: ['test-id', 'test-id-2'] },
              { theCase: case2WithComments, expectedAlerts: ['test-id-3'] },
            ],
          },
          {
            user: secOnly,
            cases: [{ theCase: case1WithComments, expectedAlerts: ['test-id', 'test-id-2'] }],
          },
          {
            user: secOnlyRead,
            cases: [{ theCase: case1WithComments, expectedAlerts: ['test-id', 'test-id-2'] }],
          },
          {
            user: obsOnly,
            cases: [{ theCase: case2WithComments, expectedAlerts: ['test-id-3'] }],
          },
          {
            user: obsOnlyRead,
            cases: [{ theCase: case2WithComments, expectedAlerts: ['test-id-3'] }],
          },
          {
            user: obsSecRead,
            cases: [
              { theCase: case1WithComments, expectedAlerts: ['test-id', 'test-id-2'] },
              { theCase: case2WithComments, expectedAlerts: ['test-id-3'] },
            ],
          },
          {
            user: obsSec,
            cases: [
              { theCase: case1WithComments, expectedAlerts: ['test-id', 'test-id-2'] },
              { theCase: case2WithComments, expectedAlerts: ['test-id-3'] },
            ],
          },
        ]) {
          for (const theCase of scenario.cases) {
            const res = await getAlertsAttachedToCase({
              supertest: supertestWithoutAuth,
              caseId: theCase.theCase.id,
              auth: {
                user: scenario.user,
                space: 'space1',
              },
            });

            expect(res.length).to.eql(theCase.expectedAlerts.length);

            for (const [index, alertId] of theCase.expectedAlerts.entries()) {
              expect(res[index]).to.eql({
                id: alertId,
                index: 'test-index',
                attached_at: theCase.theCase.comments![index].created_at,
              });
            }
          }
        }
      });

      for (const scenario of [
        { user: noKibanaPrivileges, space: 'space1' },
        { user: obsOnly, space: 'space1' },
        { user: obsOnlyRead, space: 'space1' },
        { user: secOnly, space: 'space2' },
      ]) {
        it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
          scenario.space
        } - should not get alerts`, async () => {
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

          await getAlertsAttachedToCase({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            auth: { user: scenario.user, space: scenario.space },
            expectedHttpCode: 403,
          });
        });
      }
    });
  });
};
