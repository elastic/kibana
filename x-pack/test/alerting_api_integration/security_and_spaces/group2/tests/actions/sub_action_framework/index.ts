/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import expect from '@kbn/expect';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import { IValidatedEvent } from '@kbn/event-log-plugin/generated/schemas';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getEventLog, getUrlPrefix, ObjectRemover } from '../../../../../common/lib';

/**
 * The sub action connector is defined here
 * x-pack/test/alerting_api_integration/common/plugins/alerts/server/sub_action_connector.ts
 */
const createSubActionConnector = async ({
  supertest,
  config,
  secrets,
  connectorTypeId = 'test.sub-action-connector',
  expectedHttpCode = 200,
}: {
  supertest: SuperTest.Agent;
  config?: Record<string, unknown>;
  secrets?: Record<string, unknown>;
  connectorTypeId?: string;
  expectedHttpCode?: number;
}) => {
  const response = await supertest
    .post(`${getUrlPrefix('default')}/api/actions/connector`)
    .set('kbn-xsrf', 'foo')
    .send({
      name: 'My sub connector',
      connector_type_id: connectorTypeId,
      config: {
        url: 'https://example.com',
        ...config,
      },
      secrets: {
        username: 'elastic',
        password: 'changeme',
        ...secrets,
      },
    })
    .expect(expectedHttpCode);

  return response;
};

const executeSubAction = async ({
  supertest,
  connectorId,
  subAction,
  subActionParams,
  expectedHttpCode = 200,
}: {
  supertest: SuperTest.Agent;
  connectorId: string;
  subAction: string;
  subActionParams: Record<string, unknown>;
  expectedHttpCode?: number;
}) => {
  const response = await supertest
    .post(`${getUrlPrefix('default')}/api/actions/connector/${connectorId}/_execute`)
    .set('kbn-xsrf', 'foo')
    .send({
      params: {
        subAction,
        subActionParams,
      },
    })
    .expect(expectedHttpCode);

  return response;
};

// eslint-disable-next-line import/no-default-export
export default function createActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  describe('Sub action framework', () => {
    const objectRemover = new ObjectRemover(supertest);
    after(() => objectRemover.removeAll());

    describe('Create', () => {
      it('creates the sub action connector correctly', async () => {
        const res = await createSubActionConnector({ supertest });
        objectRemover.add('default', res.body.id, 'connector', 'actions');

        expect(res.body).to.eql({
          id: res.body.id,
          is_preconfigured: false,
          is_system_action: false,
          is_deprecated: false,
          is_missing_secrets: false,
          name: 'My sub connector',
          connector_type_id: 'test.sub-action-connector',
          config: {
            url: 'https://example.com',
          },
        });
      });
    });

    describe('Schema validation', () => {
      it('passes the config schema to the actions framework and validates correctly', async () => {
        const res = await createSubActionConnector({
          supertest,
          config: { foo: 'foo' },
          expectedHttpCode: 400,
        });

        expect(res.body).to.eql({
          statusCode: 400,
          error: 'Bad Request',
          message: 'error validating action type config: [foo]: definition for this key is missing',
        });
      });

      it('passes the secrets schema to the actions framework and validates correctly', async () => {
        const res = await createSubActionConnector({
          supertest,
          secrets: { foo: 'foo' },
          expectedHttpCode: 400,
        });

        expect(res.body).to.eql({
          statusCode: 400,
          error: 'Bad Request',
          message:
            'error validating action type secrets: [foo]: definition for this key is missing',
        });
      });
    });

    describe('Sub actions', () => {
      it('executes a sub action with parameters correctly', async () => {
        const res = await createSubActionConnector({ supertest });
        objectRemover.add('default', res.body.id, 'connector', 'actions');

        const connectorId = res.body.id as string;
        const subActionParams = { id: 'test-id' };

        const execRes = await executeSubAction({
          supertest,
          connectorId,
          subAction: 'subActionWithParams',
          subActionParams,
        });

        const events: IValidatedEvent[] = await retry.try(async () => {
          return await getEventLog({
            getService,
            spaceId: 'default',
            type: 'action',
            id: connectorId,
            provider: 'actions',
            actions: new Map([
              ['execute-start', { equal: 1 }],
              ['execute', { equal: 1 }],
            ]),
          });
        });

        const executeEvent = events[1];
        expect(executeEvent?.kibana?.action?.execution?.usage?.request_body_bytes).to.eql(
          Buffer.byteLength(JSON.stringify(subActionParams))
        );

        expect(execRes.body).to.eql({
          status: 'ok',
          data: { id: 'test-id' },
          connector_id: res.body.id,
        });
      });

      it('validates the subParams correctly', async () => {
        const res = await createSubActionConnector({ supertest });
        objectRemover.add('default', res.body.id, 'connector', 'actions');

        const execRes = await executeSubAction({
          supertest,
          connectorId: res.body.id as string,
          subAction: 'subActionWithParams',
          subActionParams: { foo: 'foo' },
        });

        expect(execRes.body).to.eql({
          status: 'error',
          message: 'an error occurred while running the action',
          retry: true,
          connector_id: res.body.id,
          errorSource: TaskErrorSource.USER,
          service_message:
            'Request validation failed (Error: [id]: expected value of type [string] but got [undefined])',
        });
      });

      it('validates correctly if the subActionParams is not an object', async () => {
        const res = await createSubActionConnector({ supertest });
        objectRemover.add('default', res.body.id, 'connector', 'actions');

        for (const subActionParams of ['foo', 1, true, null, ['bar']]) {
          const execRes = await executeSubAction({
            supertest,
            connectorId: res.body.id as string,
            subAction: 'subActionWithParams',
            // @ts-expect-error
            subActionParams,
          });

          const { message, ...resWithoutMessage } = execRes.body;
          expect(resWithoutMessage).to.eql({
            status: 'error',
            retry: false,
            connector_id: res.body.id,
            errorSource: TaskErrorSource.USER,
          });
        }
      });

      it('should execute correctly without schema validation', async () => {
        const res = await createSubActionConnector({ supertest });
        objectRemover.add('default', res.body.id, 'connector', 'actions');

        const execRes = await executeSubAction({
          supertest,
          connectorId: res.body.id as string,
          subAction: 'subActionWithoutParams',
          subActionParams: {},
        });

        expect(execRes.body).to.eql({
          status: 'ok',
          data: { id: 'test' },
          connector_id: res.body.id,
        });
      });

      it('should return an empty object if the func returns undefined', async () => {
        const res = await createSubActionConnector({ supertest });
        objectRemover.add('default', res.body.id, 'connector', 'actions');

        const execRes = await executeSubAction({
          supertest,
          connectorId: res.body.id as string,
          subAction: 'noData',
          subActionParams: {},
        });

        expect(execRes.body).to.eql({
          status: 'ok',
          data: {},
          connector_id: res.body.id,
        });
      });

      it('should return an error if sub action is not registered', async () => {
        const res = await createSubActionConnector({ supertest });
        objectRemover.add('default', res.body.id, 'connector', 'actions');

        const execRes = await executeSubAction({
          supertest,
          connectorId: res.body.id as string,
          subAction: 'notRegistered',
          subActionParams: { foo: 'foo' },
        });

        expect(execRes.body).to.eql({
          status: 'error',
          message: 'an error occurred while running the action',
          retry: true,
          connector_id: res.body.id,
          errorSource: TaskErrorSource.FRAMEWORK,
          service_message: `Sub action \"notRegistered\" is not registered. Connector id: ${res.body.id}. Connector name: Test: Sub action connector. Connector type: test.sub-action-connector`,
        });
      });

      it('should return an error if the registered method is not a function', async () => {
        const res = await createSubActionConnector({ supertest });
        objectRemover.add('default', res.body.id, 'connector', 'actions');

        const execRes = await executeSubAction({
          supertest,
          connectorId: res.body.id as string,
          subAction: 'notAFunction',
          subActionParams: { foo: 'foo' },
        });

        expect(execRes.body).to.eql({
          status: 'error',
          message: 'an error occurred while running the action',
          retry: true,
          connector_id: res.body.id,
          errorSource: TaskErrorSource.FRAMEWORK,
          service_message: `Method \"notAFunction\" does not exists in service. Sub action: \"notAFunction\". Connector id: ${res.body.id}. Connector name: Test: Sub action connector. Connector type: test.sub-action-connector`,
        });
      });

      it('should return an error if the registered method does not exists', async () => {
        const res = await createSubActionConnector({ supertest });
        objectRemover.add('default', res.body.id, 'connector', 'actions');

        const execRes = await executeSubAction({
          supertest,
          connectorId: res.body.id as string,
          subAction: 'notExist',
          subActionParams: { foo: 'foo' },
        });

        expect(execRes.body).to.eql({
          status: 'error',
          message: 'an error occurred while running the action',
          retry: true,
          connector_id: res.body.id,
          errorSource: TaskErrorSource.FRAMEWORK,
          service_message: `Method \"notExist\" does not exists in service. Sub action: \"notExist\". Connector id: ${res.body.id}. Connector name: Test: Sub action connector. Connector type: test.sub-action-connector`,
        });
      });

      it('should return an error if there are no sub actions registered', async () => {
        const res = await createSubActionConnector({
          supertest,
          connectorTypeId: 'test.sub-action-connector-without-sub-actions',
        });
        objectRemover.add('default', res.body.id, 'connector', 'actions');

        const execRes = await executeSubAction({
          supertest,
          connectorId: res.body.id as string,
          subAction: 'notRegistered',
          subActionParams: { foo: 'foo' },
        });

        expect(execRes.body).to.eql({
          status: 'error',
          message: 'an error occurred while running the action',
          retry: true,
          connector_id: res.body.id,
          errorSource: TaskErrorSource.FRAMEWORK,
          service_message: 'You should register at least one subAction for your connector type',
        });
      });
    });
  });
}
