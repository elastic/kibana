/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  Case,
  CaseSeverity,
  CaseStatuses,
  UserCommentAttachmentPayload,
  AttachmentType,
  CreateCaseUserAction,
  ConnectorTypes,
  CustomFieldTypes,
  CaseCustomFields,
} from '@kbn/cases-plugin/common/types/domain';
import { getCaseUserActionUrl } from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { postCaseReq, postCommentUserReq, getPostCaseRequest } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  updateCase,
  superUserSpace1Auth,
  deleteCases,
  createComment,
  updateComment,
  deleteComment,
  extractWarningValueFromWarningHeader,
  getCaseUserActions,
  createConfiguration,
  getConfigurationRequest,
} from '../../../../common/lib/api';
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

    it('populates the action_id', async () => {
      const theCase = await createCase(supertest, postCaseReq);
      const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });

      expect(userActions.length).to.be(1);
      expect(userActions[0].action_id).not.to.be(undefined);
      expect(userActions[0]).not.to.have.property('id');
    });

    it('populates the case_id', async () => {
      const theCase = await createCase(supertest, postCaseReq);
      const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });

      expect(userActions.length).to.be(1);
      expect(userActions[0].case_id).not.to.be(undefined);
    });

    it('creates a create case user action when a case is created', async () => {
      const theCase = await createCase(supertest, postCaseReq);
      const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });
      const createCaseUserAction = userActions[0] as unknown as CreateCaseUserAction;

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
      expect(createCaseUserAction.payload.assignees).to.eql(postCaseReq.assignees);
      expect(createCaseUserAction.payload.severity).to.eql(postCaseReq.severity);
      expect(createCaseUserAction.payload.category).to.eql(null);
      expect(createCaseUserAction.payload.customFields).to.eql([]);
    });

    it('deletes all user actions when a case is deleted', async () => {
      const theCase = await createCase(supertest, postCaseReq);
      await deleteCases({ supertest, caseIDs: [theCase.id] });
      const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });

      expect(userActions.length).to.be(0);
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

    it('creates a severity update user action when changing the severity', async () => {
      const theCase = await createCase(supertest, postCaseReq);
      await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: theCase.id,
              version: theCase.version,
              severity: CaseSeverity.HIGH,
            },
          ],
        },
      });

      const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });
      const statusUserAction = userActions[1];

      expect(userActions.length).to.eql(2);
      expect(statusUserAction.type).to.eql('severity');
      expect(statusUserAction.action).to.eql('update');
      expect(statusUserAction.payload).to.eql({ severity: 'high' });
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
      const descUserAction = userActions[1];

      expect(userActions.length).to.eql(2);
      expect(descUserAction.type).to.eql('description');
      expect(descUserAction.action).to.eql('update');
      expect(descUserAction.payload).to.eql({ description: newDesc });
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
          type: AttachmentType.user,
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
          type: AttachmentType.user,
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

      const castedUserComment = restComment as UserCommentAttachmentPayload;

      expect(userActions.length).to.eql(3);
      expect(commentUserAction.type).to.eql('comment');
      expect(commentUserAction.action).to.eql('delete');
      expect(commentUserAction.comment_id).to.eql(id);

      expect(commentUserAction.payload).to.eql({
        comment: {
          comment: castedUserComment.comment,
          type: castedUserComment.type,
          owner: castedUserComment.owner,
        },
      });
    });

    it('creates user actions for custom fields correctly', async () => {
      await createConfiguration(
        supertest,
        getConfigurationRequest({
          overrides: {
            customFields: [
              {
                key: 'test_custom_field_1',
                label: 'text',
                type: CustomFieldTypes.TEXT,
                required: false,
              },
              {
                key: 'test_custom_field_2',
                label: 'toggle',
                type: CustomFieldTypes.TOGGLE,
                required: false,
              },
              {
                key: 'test_custom_field_3',
                label: 'text',
                type: CustomFieldTypes.TEXT,
                required: false,
              },
            ],
          },
        })
      );

      const customFields: CaseCustomFields = [
        {
          key: 'test_custom_field_1',
          type: CustomFieldTypes.TEXT,
          value: 'this is a text field value',
        },
        {
          key: 'test_custom_field_2',
          type: CustomFieldTypes.TOGGLE,
          value: true,
        },
        {
          key: 'test_custom_field_3',
          type: CustomFieldTypes.TEXT,
          value: 'this is a text field value 3',
        },
      ];

      const theCase = await createCase(supertest, {
        ...postCaseReq,
        customFields: [customFields[0], customFields[2]],
      });

      await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: theCase.id,
              version: theCase.version,
              customFields: [
                {
                  key: 'test_custom_field_1',
                  type: CustomFieldTypes.TEXT,
                  value: 'new value',
                },
              ],
            },
          ],
        },
      });

      const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });
      expect(userActions.length).to.eql(3);

      const createCaseUserAction = userActions[0] as unknown as CreateCaseUserAction;
      const updateCustomFieldCaseUserAction = userActions[1];
      const updateCustomFieldCaseUserAction2 = userActions[2];

      expect(createCaseUserAction.payload.customFields).to.eql([customFields[0], customFields[2]]);

      expect(updateCustomFieldCaseUserAction.type).to.eql('customFields');
      expect(updateCustomFieldCaseUserAction.action).to.eql('update');
      expect(updateCustomFieldCaseUserAction.payload).to.eql({
        customFields: [
          {
            key: 'test_custom_field_1',
            type: CustomFieldTypes.TEXT,
            value: 'new value',
          },
        ],
      });

      expect(updateCustomFieldCaseUserAction2.type).to.eql('customFields');
      expect(updateCustomFieldCaseUserAction2.action).to.eql('update');
      expect(updateCustomFieldCaseUserAction2.payload).to.eql({
        customFields: [
          {
            key: 'test_custom_field_3',
            type: CustomFieldTypes.TEXT,
            value: null,
          },
        ],
      });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      let caseInfo: Case;
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
