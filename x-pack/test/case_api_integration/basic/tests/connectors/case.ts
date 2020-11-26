/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../plugins/case/common/constants';
import { CommentType } from '../../../../../plugins/case/common/api';
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
            connector: {
              id: 'jira',
              name: 'Jira',
              type: '.jira',
              fields: {
                issueType: '10006',
                priority: 'High',
                parent: null,
              },
            },
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
            connector: {
              id: 'jira',
              name: 'Jira',
              type: '.jira',
              fields: {
                issueType: '10006',
                priority: 'High',
                parent: null,
              },
            },
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
            connector: {
              id: 'jira',
              name: 'Jira',
              type: '.jira',
              fields: {
                issueType: '10006',
                priority: 'High',
                parent: null,
              },
            },
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

      it('should respond with a 400 Bad Request when creating a case without connector', async () => {
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
            'error validating action params: types that failed validation:\n- [0.subActionParams.connector.id]: expected value of type [string] but got [undefined]\n- [1.subAction]: expected value to equal [update]\n- [2.subAction]: expected value to equal [addComment]',
          retry: false,
        });
      });

      it('should respond with a 400 Bad Request when creating jira without issueType', async () => {
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
            tags: ['case', 'connector'],
            connector: {
              id: 'jira',
              name: 'Jira',
              type: '.jira',
              fields: {
                priority: 'High',
                parent: null,
              },
            },
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
            'error validating action params: types that failed validation:\n- [0.subActionParams.connector.fields.issueType]: expected value of type [string] but got [undefined]\n- [1.subAction]: expected value to equal [update]\n- [2.subAction]: expected value to equal [addComment]',
          retry: false,
        });
      });

      it('should respond with a 400 Bad Request when creating a connector with wrong fields', async () => {
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
            tags: ['case', 'connector'],
            connector: {
              id: 'servicenow',
              name: 'Servicenow',
              type: '.servicenow',
              fields: {
                impact: 'Medium',
                severity: 'Medium',
                notExists: 'not-exists',
              },
            },
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
            'error validating action params: types that failed validation:\n- [0.subActionParams.connector.fields.notExists]: definition for this key is missing\n- [1.subAction]: expected value to equal [update]\n- [2.subAction]: expected value to equal [addComment]',
          retry: false,
        });
      });

      it('should respond with a 400 Bad Request when creating a none without fields as null', async () => {
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
            tags: ['case', 'connector'],
            connector: {
              id: 'none',
              name: 'None',
              type: '.none',
              fields: {},
            },
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
            'error validating action params: types that failed validation:\n- [0.subActionParams.connector]: Fields must be set to null for connectors of type .none\n- [1.subAction]: expected value to equal [update]\n- [2.subAction]: expected value to equal [addComment]',
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
            connector: {
              id: 'jira',
              name: 'Jira',
              type: '.jira',
              fields: {
                issueType: '10006',
                priority: 'High',
                parent: null,
              },
            },
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

      it('should create a case with connector with field as null if not provided', async () => {
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
            connector: {
              id: 'servicenow',
              name: 'Servicenow',
              type: '.servicenow',
              fields: {},
            },
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
          connector: {
            id: 'servicenow',
            name: 'Servicenow',
            type: '.servicenow',
            fields: {
              impact: null,
              severity: null,
              urgency: null,
            },
          },
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
          subAction: 'addComment',
          subActionParams: {
            comment: { comment: 'a comment', type: CommentType.user },
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
            'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [create]\n- [1.subAction]: expected value to equal [update]\n- [2.subActionParams.caseId]: expected value of type [string] but got [undefined]',
          retry: false,
        });
      });

      it('should respond with a 400 Bad Request when missing attributes of type user', async () => {
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
          subAction: 'addComment',
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
            'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [create]\n- [1.subAction]: expected value to equal [update]\n- [2.subActionParams.comment]: expected at least one defined value but got [undefined]',
          retry: false,
        });
      });

      it('should respond with a 400 Bad Request when missing attributes of type alert', async () => {
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
        const comment = { alertId: 'test-id', index: 'test-index', type: CommentType.alert };
        const params = {
          subAction: 'addComment',
          subActionParams: {
            caseId: '123',
            comment,
          },
        };

        for (const attribute of ['alertId', 'index']) {
          const requestAttributes = omit(attribute, comment);
          const caseConnector = await supertest
            .post(`/api/actions/action/${createdActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...params,
                subActionParams: { ...params.subActionParams, comment: requestAttributes },
              },
            })
            .expect(200);

          expect(caseConnector.body).to.eql({
            status: 'error',
            actionId: createdActionId,
            message: `error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [create]\n- [1.subAction]: expected value to equal [update]\n- [2.subActionParams.comment]: types that failed validation:\n - [subActionParams.comment.0.type]: expected value to equal [user]\n - [subActionParams.comment.1.${attribute}]: expected value of type [string] but got [undefined]`,
            retry: false,
          });
        }
      });

      it('should respond with a 400 Bad Request when adding excess attributes for type user', async () => {
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
          subAction: 'addComment',
          subActionParams: {
            caseId: '123',
            comment: { comment: 'a comment', type: CommentType.user },
          },
        };

        for (const attribute of ['alertId', 'index']) {
          const caseConnector = await supertest
            .post(`/api/actions/action/${createdActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...params,
                subActionParams: {
                  ...params.subActionParams,
                  comment: { ...params.subActionParams.comment, [attribute]: attribute },
                },
              },
            })
            .expect(200);

          expect(caseConnector.body).to.eql({
            status: 'error',
            actionId: createdActionId,
            message: `error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [create]\n- [1.subAction]: expected value to equal [update]\n- [2.subActionParams.comment]: types that failed validation:\n - [subActionParams.comment.0.${attribute}]: definition for this key is missing\n - [subActionParams.comment.1.type]: expected value to equal [alert]`,
            retry: false,
          });
        }
      });

      it('should respond with a 400 Bad Request when adding excess attributes for type alert', async () => {
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
          subAction: 'addComment',
          subActionParams: {
            caseId: '123',
            comment: { alertId: 'test-id', index: 'test-index', type: CommentType.alert },
          },
        };

        for (const attribute of ['comment']) {
          const caseConnector = await supertest
            .post(`/api/actions/action/${createdActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...params,
                subActionParams: {
                  ...params.subActionParams,
                  comment: { ...params.subActionParams.comment, [attribute]: attribute },
                },
              },
            })
            .expect(200);

          expect(caseConnector.body).to.eql({
            status: 'error',
            actionId: createdActionId,
            message: `error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [create]\n- [1.subAction]: expected value to equal [update]\n- [2.subActionParams.comment]: types that failed validation:\n - [subActionParams.comment.0.type]: expected value to equal [user]\n - [subActionParams.comment.1.${attribute}]: definition for this key is missing`,
            retry: false,
          });
        }
      });

      it('should respond with a 400 Bad Request when adding a comment to a case without type', async () => {
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

      it('should add a comment of type user', async () => {
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
            comment: { comment: 'a comment', type: CommentType.user },
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

      it('should add a comment of type alert', async () => {
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
            comment: { alertId: 'test-id', index: 'test-index', type: CommentType.alert },
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
