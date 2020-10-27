/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../plugins/case/common/constants';
import {
  postCaseReq,
  postCaseResp,
  removeServerGeneratedPropertiesFromCase,
  removeServerGeneratedPropertiesFromComments,
} from '../../../common/lib/mock';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');

  describe('case_connector', () => {
    let createdActionId = '';

    it('should return 200 when creating a case action successfully', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A case connector',
          actionTypeId: '.case',
          config: {},
        })
        .expect(200);

      createdActionId = createdAction.id;

      expect(createdAction).to.eql({
        id: createdActionId,
        isPreconfigured: false,
        name: 'A case connector',
        actionTypeId: '.case',
        config: {},
      });

      const { body: fetchedAction } = await supertest
        .get(`/api/actions/action/${createdActionId}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        isPreconfigured: false,
        name: 'A case connector',
        actionTypeId: '.case',
        config: {},
      });
    });

    describe('create', () => {
      it('should respond with a 400 Bad Request when creating a case without title', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A case connector',
            actionTypeId: '.case',
            config: {},
          })
          .expect(200);

        createdActionId = createdAction.id;
        const params = {
          subAction: 'create',
          subActionParams: {
            tags: ['case', 'connector'],
            description: 'case description',
          },
        };

        const caseConnector = await supertest
          .post(`/api/actions/action/${createdActionId}/_execute`)
          .set('kbn-xsrf', 'foo')
          .send({ params })
          .expect(200);

        expect(caseConnector.body).to.eql({
          status: 'error',
          actionId: createdActionId,
          message:
            'error validating action params: types that failed validation:\n- [0.subActionParams.title]: expected value of type [string] but got [undefined]\n- [1.subAction]: expected value to equal [update]\n- [2.subAction]: expected value to equal [addComment]',
          retry: false,
        });
      });

      it('should respond with a 400 Bad Request when creating a case without description', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A case connector',
            actionTypeId: '.case',
            config: {},
          })
          .expect(200);

        createdActionId = createdAction.id;
        const params = {
          subAction: 'create',
          subActionParams: {
            title: 'Case from case connector!!',
            tags: ['case', 'connector'],
          },
        };

        const caseConnector = await supertest
          .post(`/api/actions/action/${createdActionId}/_execute`)
          .set('kbn-xsrf', 'foo')
          .send({ params })
          .expect(200);

        expect(caseConnector.body).to.eql({
          status: 'error',
          actionId: createdActionId,
          message:
            'error validating action params: types that failed validation:\n- [0.subActionParams.description]: expected value of type [string] but got [undefined]\n- [1.subAction]: expected value to equal [update]\n- [2.subAction]: expected value to equal [addComment]',
          retry: false,
        });
      });

      it('should respond with a 400 Bad Request when creating a case without tags', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A case connector',
            actionTypeId: '.case',
            config: {},
          })
          .expect(200);

        createdActionId = createdAction.id;
        const params = {
          subAction: 'create',
          subActionParams: {
            title: 'Case from case connector!!',
            description: 'case description',
          },
        };

        const caseConnector = await supertest
          .post(`/api/actions/action/${createdActionId}/_execute`)
          .set('kbn-xsrf', 'foo')
          .send({ params })
          .expect(200);

        expect(caseConnector.body).to.eql({
          status: 'error',
          actionId: createdActionId,
          message:
            'error validating action params: types that failed validation:\n- [0.subActionParams.tags]: expected value of type [array] but got [undefined]\n- [1.subAction]: expected value to equal [update]\n- [2.subAction]: expected value to equal [addComment]',
          retry: false,
        });
      });

      it('should create a case', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A case connector',
            actionTypeId: '.case',
            config: {},
          })
          .expect(200);

        createdActionId = createdAction.id;
        const params = {
          subAction: 'create',
          subActionParams: {
            title: 'Case from case connector!!',
            tags: ['case', 'connector'],
            description: 'case description',
          },
        };

        const caseConnector = await supertest
          .post(`/api/actions/action/${createdActionId}/_execute`)
          .set('kbn-xsrf', 'foo')
          .send({ params })
          .expect(200);

        const { body } = await supertest
          .get(`${CASES_URL}/${caseConnector.body.data.id}`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        const data = removeServerGeneratedPropertiesFromCase(body);
        expect(data).to.eql({
          ...postCaseResp(caseConnector.body.data.id),
          ...params.subActionParams,
          created_by: {
            email: null,
            full_name: null,
            username: null,
          },
        });
      });
    });

    describe('update', () => {
      it('should respond with a 400 Bad Request when updating a case without id', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A case connector',
            actionTypeId: '.case',
            config: {},
          })
          .expect(200);

        createdActionId = createdAction.id;
        const params = {
          subAction: 'update',
          subActionParams: {
            version: '123',
            title: 'Case from case connector!!',
          },
        };

        const caseConnector = await supertest
          .post(`/api/actions/action/${createdActionId}/_execute`)
          .set('kbn-xsrf', 'foo')
          .send({ params })
          .expect(200);

        expect(caseConnector.body).to.eql({
          status: 'error',
          actionId: createdActionId,
          message:
            'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [create]\n- [1.subActionParams.id]: expected value of type [string] but got [undefined]\n- [2.subAction]: expected value to equal [addComment]',
          retry: false,
        });
      });

      it('should respond with a 400 Bad Request when updating a case without version', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A case connector',
            actionTypeId: '.case',
            config: {},
          })
          .expect(200);

        createdActionId = createdAction.id;
        const params = {
          subAction: 'update',
          subActionParams: {
            id: '123',
            title: 'Case from case connector!!',
          },
        };

        const caseConnector = await supertest
          .post(`/api/actions/action/${createdActionId}/_execute`)
          .set('kbn-xsrf', 'foo')
          .send({ params })
          .expect(200);

        expect(caseConnector.body).to.eql({
          status: 'error',
          actionId: createdActionId,
          message:
            'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [create]\n- [1.subActionParams.version]: expected value of type [string] but got [undefined]\n- [2.subAction]: expected value to equal [addComment]',
          retry: false,
        });
      });

      it('should update a case', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A case connector',
            actionTypeId: '.case',
            config: {},
          })
          .expect(200);

        createdActionId = createdAction.id;

        const caseRes = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send(postCaseReq)
          .expect(200);

        const params = {
          subAction: 'update',
          subActionParams: {
            id: caseRes.body.id,
            version: caseRes.body.version,
            title: 'Case from case connector!!',
          },
        };

        await supertest
          .post(`/api/actions/action/${createdActionId}/_execute`)
          .set('kbn-xsrf', 'foo')
          .send({ params })
          .expect(200);

        const { body } = await supertest
          .get(`${CASES_URL}/${caseRes.body.id}`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        const data = removeServerGeneratedPropertiesFromCase(body);
        expect(data).to.eql({
          ...postCaseResp(caseRes.body.id),
          title: 'Case from case connector!!',
          updated_by: {
            email: null,
            full_name: null,
            username: null,
          },
        });
      });
    });

    describe('addComment', () => {
      it('should respond with a 400 Bad Request when adding a comment to a case without caseId', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A case connector',
            actionTypeId: '.case',
            config: {},
          })
          .expect(200);

        createdActionId = createdAction.id;
        const params = {
          subAction: 'update',
          subActionParams: {
            comment: { comment: 'a comment' },
          },
        };

        const caseConnector = await supertest
          .post(`/api/actions/action/${createdActionId}/_execute`)
          .set('kbn-xsrf', 'foo')
          .send({ params })
          .expect(200);

        expect(caseConnector.body).to.eql({
          status: 'error',
          actionId: createdActionId,
          message:
            'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [create]\n- [1.subActionParams.id]: expected value of type [string] but got [undefined]\n- [2.subAction]: expected value to equal [addComment]',
          retry: false,
        });
      });

      it('should respond with a 400 Bad Request when adding a comment to a case without comment', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A case connector',
            actionTypeId: '.case',
            config: {},
          })
          .expect(200);

        createdActionId = createdAction.id;
        const params = {
          subAction: 'update',
          subActionParams: {
            caseId: '123',
          },
        };

        const caseConnector = await supertest
          .post(`/api/actions/action/${createdActionId}/_execute`)
          .set('kbn-xsrf', 'foo')
          .send({ params })
          .expect(200);

        expect(caseConnector.body).to.eql({
          status: 'error',
          actionId: createdActionId,
          message:
            'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [create]\n- [1.subActionParams.id]: expected value of type [string] but got [undefined]\n- [2.subAction]: expected value to equal [addComment]',
          retry: false,
        });
      });

      it('should add a comment', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A case connector',
            actionTypeId: '.case',
            config: {},
          })
          .expect(200);

        createdActionId = createdAction.id;

        const caseRes = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send(postCaseReq)
          .expect(200);

        const params = {
          subAction: 'addComment',
          subActionParams: {
            caseId: caseRes.body.id,
            comment: { comment: 'a comment' },
          },
        };

        await supertest
          .post(`/api/actions/action/${createdActionId}/_execute`)
          .set('kbn-xsrf', 'foo')
          .send({ params })
          .expect(200);

        const { body } = await supertest
          .get(`${CASES_URL}/${caseRes.body.id}`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        const data = removeServerGeneratedPropertiesFromCase(body);
        const comments = removeServerGeneratedPropertiesFromComments(data.comments ?? []);
        expect({ ...data, comments }).to.eql({
          ...postCaseResp(caseRes.body.id),
          comments,
          totalComment: 1,
          updated_by: {
            email: null,
            full_name: null,
            username: null,
          },
        });
      });
    });
  });
};
