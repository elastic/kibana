/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  CaseResponse,
  CaseSeverity,
  CaseStatuses,
  ConnectorTypes,
} from '@kbn/cases-plugin/common/api';

import {
  globalRead,
  obsSec,
  obsSecRead,
  noKibanaPrivileges,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';
import { getCaseUserActionStats } from '../../../../common/lib/user_actions';
import { getPostCaseRequest, postCaseReq, postCommentUserReq } from '../../../../common/lib/mock';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  createCase,
  createComment,
  deleteAllCaseItems,
  updateCase,
  superUserSpace1Auth,
} from '../../../../common/lib/utils';

const CASE_UPDATE_DATA = (id: string, version: string) => ({
  status: CaseStatuses.open,
  severity: CaseSeverity.MEDIUM,
  title: 'new title',
  description: 'new desc',
  settings: {
    syncAlerts: false,
  },
  tags: ['one', 'two'],
  assignees: [
    {
      uid: '123',
    },
  ],
  connector: {
    id: 'my-id',
    name: 'Jira',
    type: ConnectorTypes.jira as const,
    fields: null,
  },
  id,
  version,
});

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_user_action_stats', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('all "other" user action types are included', async () => {
      const theCase = await createCase(supertest, postCaseReq);
      await updateCase({
        supertest,
        params: {
          cases: [CASE_UPDATE_DATA(theCase.id, theCase.version)],
        },
      });

      const userActionTotals = await getCaseUserActionStats({ supertest, caseID: theCase.id });

      expect(userActionTotals.total).to.equal(9);
      expect(userActionTotals.total_comments).to.equal(0);
      expect(userActionTotals.total_other_actions).to.equal(9);
      expect(userActionTotals.total).to.equal(
        userActionTotals.total_comments + userActionTotals.total_other_actions
      );
    });

    it('returns correct total for comments', async () => {
      const theCase = await createCase(supertest, postCaseReq);

      await createComment({
        supertest,
        caseId: theCase.id,
        params: postCommentUserReq,
      });

      await createComment({
        supertest,
        caseId: theCase.id,
        params: postCommentUserReq,
      });

      const userActionTotals = await getCaseUserActionStats({ supertest, caseID: theCase.id });

      expect(userActionTotals.total).to.equal(3);
      expect(userActionTotals.total_comments).to.equal(2);
      expect(userActionTotals.total_other_actions).to.equal(1);
      expect(userActionTotals.total).to.equal(
        userActionTotals.total_comments + userActionTotals.total_other_actions
      );
    });

    it('total user actions matches the expected total', async () => {
      const theCase = await createCase(supertest, postCaseReq);
      await updateCase({
        supertest,
        params: {
          cases: [CASE_UPDATE_DATA(theCase.id, theCase.version)],
        },
      });

      await createComment({
        supertest,
        caseId: theCase.id,
        params: postCommentUserReq,
      });

      await createComment({
        supertest,
        caseId: theCase.id,
        params: postCommentUserReq,
      });

      const userActionTotals = await getCaseUserActionStats({ supertest, caseID: theCase.id });

      expect(userActionTotals.total).to.equal(11);
      expect(userActionTotals.total_comments).to.equal(2);
      expect(userActionTotals.total_other_actions).to.equal(9);
      expect(userActionTotals.total).to.equal(
        userActionTotals.total_comments + userActionTotals.total_other_actions
      );
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      let theCase: CaseResponse;
      before(async () => {
        theCase = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
          user: superUser,
          space: 'space1',
        });

        await updateCase({
          supertest: supertestWithoutAuth,
          params: {
            cases: [CASE_UPDATE_DATA(theCase.id, theCase.version)],
          },
          auth: superUserSpace1Auth,
        });

        await createComment({
          supertest,
          caseId: theCase.id,
          params: postCommentUserReq,
          auth: superUserSpace1Auth,
        });
      });

      after(async () => {
        await deleteAllCaseItems(es);
      });

      it('should get the user actions for a case when the user has the correct permissions', async () => {
        for (const user of [globalRead, superUser, secOnly, secOnlyRead, obsSec, obsSecRead]) {
          const userActionTotals = await getCaseUserActionStats({
            supertest: supertestWithoutAuth,
            caseID: theCase.id,
            auth: { user, space: 'space1' },
          });

          expect(userActionTotals.total).to.equal(10);
          expect(userActionTotals.total_comments).to.equal(1);
          expect(userActionTotals.total_other_actions).to.equal(9);
          expect(userActionTotals.total).to.equal(
            userActionTotals.total_comments + userActionTotals.total_other_actions
          );
        }
      });

      for (const scenario of [
        { user: noKibanaPrivileges, space: 'space1' },
        { user: secOnly, space: 'space2' },
      ]) {
        it(`should 403 when requesting the user action stats of a case with user ${
          scenario.user.username
        } with role(s) ${scenario.user.roles.join()} and space ${scenario.space}`, async () => {
          await getCaseUserActionStats({
            supertest: supertestWithoutAuth,
            caseID: theCase.id,
            auth: { user: scenario.user, space: scenario.space },
            expectedHttpCode: 403,
          });
        });
      }
    });
  });
};
