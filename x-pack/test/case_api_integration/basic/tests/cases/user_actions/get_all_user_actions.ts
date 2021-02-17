/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CASE_CONFIGURE_URL, CASES_URL } from '../../../../../../plugins/case/common/constants';
import { CommentType } from '../../../../../../plugins/case/common/api';
import {
  userActionPostResp,
  defaultUser,
  postCaseReq,
  postCommentUserReq,
} from '../../../../common/lib/mock';
import {
  deleteCases,
  deleteCasesUserActions,
  deleteComments,
  deleteConfiguration,
  getConfiguration,
  getServiceNowConnector,
} from '../../../../common/lib/utils';

import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';
import {
  ExternalServiceSimulator,
  getExternalServiceSimulatorPath,
} from '../../../../../alerting_api_integration/common/fixtures/plugins/actions_simulators/server/plugin';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const actionsRemover = new ActionsRemover(supertest);
  const kibanaServer = getService('kibanaServer');

  describe('get_all_user_actions', () => {
    let servicenowSimulatorURL: string = '<could not determine kibana url>';
    before(() => {
      servicenowSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
      );
    });
    afterEach(async () => {
      await deleteCases(es);
      await deleteComments(es);
      await deleteConfiguration(es);
      await deleteCasesUserActions(es);
      await actionsRemover.removeAll();
    });

    it(`on new case, user action: 'create' should be called with actionFields: ['description', 'status', 'tags', 'title', 'connector', 'settings]`, async () => {
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
      ]);
      expect(body[0].action).to.eql('create');
      expect(body[0].old_value).to.eql(null);
      expect(JSON.parse(body[0].new_value)).to.eql(userActionPostResp);
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
      expect(JSON.parse(body[1].old_value)).to.eql({
        id: 'none',
        name: 'none',
        type: '.none',
        fields: null,
      });
      expect(JSON.parse(body[1].new_value)).to.eql({
        id: '123',
        name: 'Connector',
        type: '.jira',
        fields: { issueType: 'Task', priority: 'High', parent: null },
      });
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
      await supertest.patch(`${CASES_URL}/${postedCase.id}/comments`).set('kbn-xsrf', 'true').send({
        id: patchedCase.comments[0].id,
        version: patchedCase.comments[0].version,
        comment: newComment,
        type: CommentType.user,
      });

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
      });
    });

    it(`on new push to service, user action: 'push-to-service' should be called with actionFields: ['pushed']`, async () => {
      const { body: connector } = await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'true')
        .send({
          ...getServiceNowConnector(),
          config: { apiUrl: servicenowSimulatorURL },
        })
        .expect(200);

      actionsRemover.add('default', connector.id, 'action', 'actions');

      const { body: configure } = await supertest
        .post(CASE_CONFIGURE_URL)
        .set('kbn-xsrf', 'true')
        .send(
          getConfiguration({
            id: connector.id,
            name: connector.name,
            type: connector.actionTypeId,
          })
        )
        .expect(200);

      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          ...postCaseReq,
          connector: getConfiguration({
            id: connector.id,
            name: connector.name,
            type: connector.actionTypeId,
            fields: {
              urgency: '2',
              impact: '2',
              severity: '2',
              category: 'software',
              subcategory: 'os',
            },
          }).connector,
        })
        .expect(200);

      await supertest
        .post(`${CASES_URL}/${postedCase.id}/connector/${connector.id}/_push`)
        .set('kbn-xsrf', 'true')
        .send({})
        .expect(200);

      const { body } = await supertest
        .get(`${CASES_URL}/${postedCase.id}/user_actions`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body.length).to.eql(2);
      expect(body[1].action_field).to.eql(['pushed']);
      expect(body[1].action).to.eql('push-to-service');
      expect(body[1].old_value).to.eql(null);
      const newValue = JSON.parse(body[1].new_value);
      expect(newValue.connector_id).to.eql(configure.connector.id);
      expect(newValue.pushed_by).to.eql(defaultUser);
    });
  });
};
