/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  CaseResponse,
  CaseStatuses,
  CommentType,
  ConnectorTypes,
  getCaseUserActionUrl,
} from '../../../../../../plugins/cases/common/api';
import { CreateCaseUserAction } from '../../../../../../plugins/cases/common/api/cases/user_actions/create_case';
import { postCaseReq, postCommentUserReq, getPostCaseRequest } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  updateCase,
  getCaseUserActions,
  superUserSpace1Auth,
  deleteCases,
  createComment,
  updateComment,
  deleteComment,
  extractWarningValueFromWarningHeader,
} from '../../../../common/lib/utils';
import {
  globalRead,
  noKibanaPrivileges,
  obsSec,
  obsSecRead,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';
import { assertWarningHeader } from '../../../../common/lib/validation';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_all_user_actions', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('creates a create case user action when a case is created', async () => {
      const theCase = await createCase(supertest, postCaseReq);
      const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });
      const createCaseUserAction = userActions[0] as CreateCaseUserAction;

      expect(userActions.length).to.eql(1);
      expect(createCaseUserAction.action).to.eql('create');
      expect(createCaseUserAction.type).to.eql('create_case');
      expect(createCaseUserAction.payload.description).to.eql(postCaseReq.description);
      expect(createCaseUserAction.payload.status).to.eql('open');
      expect(createCaseUserAction.payload.tags).to.eql(postCaseReq.tags);
      expect(createCaseUserAction.payload.title).to.eql(postCaseReq.title);
      expect(createCaseUserAction.payload.settings).to.eql(postCaseReq.settings);
      expect(createCaseUserAction.payload.owner).to.eql(postCaseReq.owner);
      expect(createCaseUserAction.payload.connector).to.eql(postCaseReq.connector);
    });

    it('creates a delete case user action when a case is deleted', async () => {
      const theCase = await createCase(supertest, postCaseReq);
      await deleteCases({ supertest, caseIDs: [theCase.id] });
      const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });

      const userAction = userActions[1];

      // One for creation and one for deletion
      expect(userActions.length).to.eql(2);

      expect(userAction.action).to.eql('delete');
      expect(userAction.type).to.eql('delete_case');
      expect(userAction.payload).to.eql({});
    });

    it('creates a status update user action when changing the status', async () => {
      const theCase = await createCase(supertest, postCaseReq);
      await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: theCase.id,
              version: theCase.version,
              status: CaseStatuses.closed,
            },
          ],
        },
      });

      const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });
      const statusUserAction = userActions[1];

      expect(userActions.length).to.eql(2);
      expect(statusUserAction.type).to.eql('status');
      expect(statusUserAction.action).to.eql('update');
      expect(statusUserAction.payload).to.eql({ status: 'closed' });
    });

    it('creates a connector update user action', async () => {
      const newConnector = {
        id: '123',
        name: 'Connector',
        type: ConnectorTypes.jira as const,
        fields: { issueType: 'Task', priority: 'High', parent: null },
      };

      const theCase = await createCase(supertest, postCaseReq);
      await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: theCase.id,
              version: theCase.version,
              connector: newConnector,
            },
          ],
        },
      });

      const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });
      const connectorUserAction = userActions[1];

      expect(userActions.length).to.eql(2);
      expect(connectorUserAction.type).to.eql('connector');
      expect(connectorUserAction.action).to.eql('update');
      expect(connectorUserAction.payload).to.eql({
        connector: {
          id: '123',
          name: 'Connector',
          type: '.jira',
          fields: { issueType: 'Task', priority: 'High', parent: null },
        },
      });
    });

    it('creates an add and delete tag user action', async () => {
      const theCase = await createCase(supertest, postCaseReq);
      await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: theCase.id,
              version: theCase.version,
              tags: ['cool', 'neat'],
            },
          ],
        },
      });

      const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });
      const addTagsUserAction = userActions[1];
      const deleteTagsUserAction = userActions[2];

      expect(userActions.length).to.eql(3);
      expect(addTagsUserAction.type).to.eql('tags');
      expect(addTagsUserAction.action).to.eql('add');
      expect(addTagsUserAction.payload).to.eql({ tags: ['cool', 'neat'] });
      expect(deleteTagsUserAction.type).to.eql('tags');
      expect(deleteTagsUserAction.action).to.eql('delete');
      expect(deleteTagsUserAction.payload).to.eql({ tags: ['defacement'] });
    });

    it('creates an update title user action', async () => {
      const newTitle = 'Such a great title';
      const theCase = await createCase(supertest, postCaseReq);

      await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: theCase.id,
              version: theCase.version,
              title: newTitle,
            },
          ],
        },
      });

      const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });
      const titleUserAction = userActions[1];

      expect(userActions.length).to.eql(2);
      expect(titleUserAction.type).to.eql('title');
      expect(titleUserAction.action).to.eql('update');
      expect(titleUserAction.payload).to.eql({ title: newTitle });
    });

    it('creates a description update user action', async () => {
      const newDesc = 'Such a great description';
      const theCase = await createCase(supertest, postCaseReq);

      await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: theCase.id,
              version: theCase.version,
              description: newDesc,
            },
          ],
        },
      });

      const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });
      const titleUserAction = userActions[1];

      expect(userActions.length).to.eql(2);
      expect(titleUserAction.type).to.eql('description');
      expect(titleUserAction.action).to.eql('update');
      expect(titleUserAction.payload).to.eql({ description: newDesc });
    });

    it('creates a create comment user action', async () => {
      const theCase = await createCase(supertest, postCaseReq);

      const caseWithComments = await createComment({
        supertest,
        caseId: theCase.id,
        params: postCommentUserReq,
      });
      const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });
      const commentUserAction = userActions[1];

      expect(userActions.length).to.eql(2);
      expect(commentUserAction.type).to.eql('comment');
      expect(commentUserAction.action).to.eql('create');
      expect(commentUserAction.comment_id).to.eql(caseWithComments.comments![0].id);
      expect(commentUserAction.payload).to.eql({ comment: postCommentUserReq });
    });

    it('creates an update comment user action', async () => {
      const newComment = 'Well I decided to update my comment. So what? Deal with it.';
      const theCase = await createCase(supertest, postCaseReq);
      const caseWithComments = await createComment({
        supertest,
        caseId: theCase.id,
        params: postCommentUserReq,
      });

      await updateComment({
        supertest,
        caseId: theCase.id,
        req: {
          id: caseWithComments.comments![0].id,
          version: caseWithComments.comments![0].version,
          comment: newComment,
          type: CommentType.user,
          owner: 'securitySolutionFixture',
        },
      });

      const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });
      const commentUserAction = userActions[2];

      expect(userActions.length).to.eql(3);
      expect(commentUserAction.type).to.eql('comment');
      expect(commentUserAction.action).to.eql('update');
      expect(commentUserAction.comment_id).to.eql(caseWithComments.comments![0].id);
      expect(commentUserAction.payload).to.eql({
        comment: {
          comment: newComment,
          type: CommentType.user,
          owner: 'securitySolutionFixture',
        },
      });
    });

    it('creates a delete comment user action', async () => {
      const theCase = await createCase(supertest, postCaseReq);
      const caseWithComments = await createComment({
        supertest,
        caseId: theCase.id,
        params: postCommentUserReq,
      });

      await deleteComment({
        supertest,
        caseId: theCase.id,
        commentId: caseWithComments.comments![0].id,
      });

      const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });
      const commentUserAction = userActions[2];
      const { id, version: _, ...restComment } = caseWithComments.comments![0];

      expect(userActions.length).to.eql(3);
      expect(commentUserAction.type).to.eql('comment');
      expect(commentUserAction.action).to.eql('delete');
      expect(commentUserAction.comment_id).to.eql(id);
      expect(commentUserAction.payload).to.eql({ comment: restComment });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      let caseInfo: CaseResponse;
      beforeEach(async () => {
        caseInfo = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, {
          user: superUser,
          space: 'space1',
        });

        await updateCase({
          supertest: supertestWithoutAuth,
          params: {
            cases: [
              {
                id: caseInfo.id,
                version: caseInfo.version,
                status: CaseStatuses.closed,
              },
            ],
          },
          auth: superUserSpace1Auth,
        });
      });

      it('should get the user actions for a case when the user has the correct permissions', async () => {
        for (const user of [globalRead, superUser, secOnly, secOnlyRead, obsSec, obsSecRead]) {
          const userActions = await getCaseUserActions({
            supertest: supertestWithoutAuth,
            caseID: caseInfo.id,
            auth: { user, space: 'space1' },
          });

          expect(userActions.length).to.eql(2);
        }
      });

      for (const scenario of [
        { user: noKibanaPrivileges, space: 'space1' },
        { user: secOnly, space: 'space2' },
      ]) {
        it(`should 403 when requesting the user actions of a case with user ${
          scenario.user.username
        } with role(s) ${scenario.user.roles.join()} and space ${scenario.space}`, async () => {
          await getCaseUserActions({
            supertest: supertestWithoutAuth,
            caseID: caseInfo.id,
            auth: { user: scenario.user, space: scenario.space },
            expectedHttpCode: 403,
          });
        });
      }
    });

    describe('deprecations', () => {
      it('should return a warning header', async () => {
        const theCase = await createCase(supertest, postCaseReq);
        const res = await supertest.get(getCaseUserActionUrl(theCase.id)).expect(200);
        const warningHeader = res.header.warning;

        assertWarningHeader(warningHeader);

        const warningValue = extractWarningValueFromWarningHeader(warningHeader);
        expect(warningValue).to.be('Deprecated endpoint');
      });
    });
  });
};
