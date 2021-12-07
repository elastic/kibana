/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../../plugins/cases/common/constants';
import {
  CaseResponse,
  CaseStatuses,
  CommentType,
} from '../../../../../../plugins/cases/common/api';
import {
  userActionPostResp,
  postCaseReq,
  postCommentUserReq,
  getPostCaseRequest,
} from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  updateCase,
  getCaseUserActions,
  superUserSpace1Auth,
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

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_all_user_actions', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it(`on new case, user action: 'create' should be called with actionFields: ['description', 'status', 'tags', 'title', 'connector', 'settings, owner]`, async () => {
      const { id: connectorId, ...restConnector } = userActionPostResp.connector;

      const userActionNewValueNoId = {
        ...userActionPostResp,
        connector: {
          ...restConnector,
        },
      };

      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body } = await supertest
        .get(`${CASES_URL}/${postedCase.id}/user_actions`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body.length).to.eql(1);

      expect(body[0].action_field).to.eql([
        'description',
        'status',
        'tags',
        'title',
        'connector',
        'settings',
        'owner',
      ]);
      expect(body[0].action).to.eql('create');
      expect(body[0].old_value).to.eql(null);
      expect(body[0].old_val_connector_id).to.eql(null);
      // this will be null because it is for the none connector
      expect(body[0].new_val_connector_id).to.eql(null);
      expect(JSON.parse(body[0].new_value)).to.eql(userActionNewValueNoId);
    });

    it(`on close case, user action: 'update' should be called with actionFields: ['status']`, async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              status: 'closed',
            },
          ],
        })
        .expect(200);

      const { body } = await supertest
        .get(`${CASES_URL}/${postedCase.id}/user_actions`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body.length).to.eql(2);
      expect(body[1].action_field).to.eql(['status']);
      expect(body[1].action).to.eql('update');
      expect(body[1].old_value).to.eql('open');
      expect(body[1].new_value).to.eql('closed');
    });

    it(`on update case connector, user action: 'update' should be called with actionFields: ['connector']`, async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const newConnector = {
        id: '123',
        name: 'Connector',
        type: '.jira',
        fields: { issueType: 'Task', priority: 'High', parent: null },
      };

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              connector: newConnector,
            },
          ],
        })
        .expect(200);

      const { body } = await supertest
        .get(`${CASES_URL}/${postedCase.id}/user_actions`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body.length).to.eql(2);
      expect(body[1].action_field).to.eql(['connector']);
      expect(body[1].action).to.eql('update');
      // this is null because it is the none connector
      expect(body[1].old_val_connector_id).to.eql(null);
      expect(JSON.parse(body[1].old_value)).to.eql({
        name: 'none',
        type: '.none',
        fields: null,
      });
      expect(JSON.parse(body[1].new_value)).to.eql({
        name: 'Connector',
        type: '.jira',
        fields: { issueType: 'Task', priority: 'High', parent: null },
      });
      expect(body[1].new_val_connector_id).to.eql('123');
    });

    it(`on update tags, user action: 'add' and 'delete' should be called with actionFields: ['tags']`, async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              tags: ['cool', 'neat'],
            },
          ],
        })
        .expect(200);

      const { body } = await supertest
        .get(`${CASES_URL}/${postedCase.id}/user_actions`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body.length).to.eql(3);
      expect(body[1].action_field).to.eql(['tags']);
      expect(body[1].action).to.eql('add');
      expect(body[1].old_value).to.eql(null);
      expect(body[1].new_value).to.eql('cool, neat');
      expect(body[2].action_field).to.eql(['tags']);
      expect(body[2].action).to.eql('delete');
      expect(body[2].old_value).to.eql(null);
      expect(body[2].new_value).to.eql('defacement');
    });

    it(`on update title, user action: 'update' should be called with actionFields: ['title']`, async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const newTitle = 'Such a great title';
      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              title: newTitle,
            },
          ],
        })
        .expect(200);

      const { body } = await supertest
        .get(`${CASES_URL}/${postedCase.id}/user_actions`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body.length).to.eql(2);
      expect(body[1].action_field).to.eql(['title']);
      expect(body[1].action).to.eql('update');
      expect(body[1].old_value).to.eql(postCaseReq.title);
      expect(body[1].new_value).to.eql(newTitle);
    });

    it(`on update description, user action: 'update' should be called with actionFields: ['description']`, async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const newDesc = 'Such a great description';
      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              description: newDesc,
            },
          ],
        })
        .expect(200);

      const { body } = await supertest
        .get(`${CASES_URL}/${postedCase.id}/user_actions`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body.length).to.eql(2);
      expect(body[1].action_field).to.eql(['description']);
      expect(body[1].action).to.eql('update');
      expect(body[1].old_value).to.eql(postCaseReq.description);
      expect(body[1].new_value).to.eql(newDesc);
    });

    it(`on new comment, user action: 'create' should be called with actionFields: ['comments']`, async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
        .expect(200);

      const { body } = await supertest
        .get(`${CASES_URL}/${postedCase.id}/user_actions`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body.length).to.eql(2);
      expect(body[1].action_field).to.eql(['comment']);
      expect(body[1].action).to.eql('create');
      expect(body[1].old_value).to.eql(null);
      expect(JSON.parse(body[1].new_value)).to.eql(postCommentUserReq);
    });

    it(`on update comment, user action: 'update' should be called with actionFields: ['comments']`, async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body: patchedCase } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
        .expect(200);

      const newComment = 'Well I decided to update my comment. So what? Deal with it.';
      await supertest
        .patch(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send({
          id: patchedCase.comments[0].id,
          version: patchedCase.comments[0].version,
          comment: newComment,
          type: CommentType.user,
          owner: 'securitySolutionFixture',
        })
        .expect(200);

      const { body } = await supertest
        .get(`${CASES_URL}/${postedCase.id}/user_actions`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body.length).to.eql(3);
      expect(body[2].action_field).to.eql(['comment']);
      expect(body[2].action).to.eql('update');
      expect(JSON.parse(body[2].old_value)).to.eql(postCommentUserReq);
      expect(JSON.parse(body[2].new_value)).to.eql({
        comment: newComment,
        type: CommentType.user,
        owner: 'securitySolutionFixture',
      });
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
  });
};
