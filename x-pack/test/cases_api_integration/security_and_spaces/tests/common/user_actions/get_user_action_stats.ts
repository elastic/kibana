/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Case, CaseSeverity, CaseStatuses } from '@kbn/cases-plugin/common/types/domain';

import { ConnectorTypes } from '@kbn/cases-plugin/common/types/domain';
import {
  globalRead,
  obsSec,
  obsSecRead,
  noKibanaPrivileges,
  secOnly,
  secOnlyRead,
  superUser,
  obsOnly,
  obsOnlyRead,
} from '../../../../common/lib/authentication/users';
import {
  getPostCaseRequest,
  persistableStateAttachment,
  postCaseReq,
  postCommentActionsReq,
  postCommentAlertReq,
  postCommentUserReq,
  postExternalReferenceESReq,
} from '../../../../common/lib/mock';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  bulkCreateAttachments,
  createCase,
  createComment,
  deleteAllCaseItems,
  updateCase,
  superUserSpace1Auth,
  getCaseUserActionStats,
} from '../../../../common/lib/api';

const getCaseUpdateData = (id: string, version: string) => ({
  status: CaseStatuses.open,
  severity: CaseSeverity.MEDIUM,
  title: 'new title',
  description: 'new desc',
  settings: {
    syncAlerts: false,
  },
  tags: ['one', 'two'],
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

    it('returns correct total for comments', async () => {
      // 1 creation action
      const theCase = await createCase(supertest, postCaseReq);

      await bulkCreateAttachments({
        supertest,
        caseId: theCase.id,
        params: [
          // Only this one should show up in total_comments
          postCommentUserReq,
          // The ones below count as total_other_actions
          postExternalReferenceESReq,
          persistableStateAttachment,
          postCommentActionsReq,
          postCommentAlertReq,
        ],
      });

      const userActionTotals = await getCaseUserActionStats({ supertest, caseID: theCase.id });

      expect(userActionTotals.total).to.equal(6);
      expect(userActionTotals.total_comments).to.equal(1);
      expect(userActionTotals.total_other_actions).to.equal(5);
      expect(userActionTotals.total).to.equal(
        userActionTotals.total_comments + userActionTotals.total_other_actions
      );
    });

    it('returns the correct stats when a case update occurs', async () => {
      // 1 creation action
      const theCase = await createCase(supertest, postCaseReq);

      // this update should account for 7 "other actions"
      await updateCase({
        supertest,
        params: {
          cases: [getCaseUpdateData(theCase.id, theCase.version)],
        },
      });

      await bulkCreateAttachments({
        supertest,
        caseId: theCase.id,
        params: [
          // only this one should show up in total_comments
          postCommentUserReq,
          // the ones below count as total_other_actions
          postExternalReferenceESReq,
          persistableStateAttachment,
          postCommentActionsReq,
          postCommentAlertReq,
        ],
      });

      const userActionTotals = await getCaseUserActionStats({ supertest, caseID: theCase.id });

      expect(userActionTotals.total).to.equal(13);
      expect(userActionTotals.total_comments).to.equal(1);
      expect(userActionTotals.total_other_actions).to.equal(12);
      expect(userActionTotals.total).to.equal(
        userActionTotals.total_comments + userActionTotals.total_other_actions
      );
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      let theCase: Case;
      beforeEach(async () => {
        theCase = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
          user: superUser,
          space: 'space1',
        });

        await updateCase({
          supertest: supertestWithoutAuth,
          params: {
            cases: [getCaseUpdateData(theCase.id, theCase.version)],
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

      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      it('should get the user actions for a case when the user has the correct permissions', async () => {
        for (const user of [globalRead, superUser, secOnly, secOnlyRead, obsSec, obsSecRead]) {
          const userActionTotals = await getCaseUserActionStats({
            supertest: supertestWithoutAuth,
            caseID: theCase.id,
            auth: { user, space: 'space1' },
          });

          expect(userActionTotals.total).to.equal(9);
          expect(userActionTotals.total_comments).to.equal(1);
          expect(userActionTotals.total_other_actions).to.equal(8);
          expect(userActionTotals.total).to.equal(
            userActionTotals.total_comments + userActionTotals.total_other_actions
          );
        }
      });

      for (const scenario of [
        { user: noKibanaPrivileges, space: 'space1' },
        { user: secOnly, space: 'space2' },
        { user: obsOnly, space: 'space1' },
        { user: obsOnlyRead, space: 'space1' },
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
