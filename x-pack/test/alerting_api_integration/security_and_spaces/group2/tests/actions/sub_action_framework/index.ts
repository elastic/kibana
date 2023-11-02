/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import expect from '@kbn/expect';
import {
  SENTINELONE_CONNECTOR_ID,
  SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/sentinelone/constants';
import { Role } from '@kbn/security-plugin/common';
import { SECURITY_PRIVILEGE_ID } from '@kbn/security-solution-features/privileges';
import { ToolingLog } from '@kbn/tooling-log';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover } from '../../../../../common/lib';

let log: ToolingLog;
const DEFAULT_SECRETS = Object.freeze({ username: 'elastic', password: 'changeme' });

interface LogErrorDetailsInterface {
  (this: SuperTest.Test, err: Error & { response?: any }): SuperTest.Test;
  ignoreCodes: (
    codes: number[]
  ) => (this: SuperTest.Test, err: Error & { response?: SuperTest.Response }) => SuperTest.Test;
}

const logErrorDetails: LogErrorDetailsInterface = function (err) {
  if (err.response && (err.response.body || err.response.text)) {
    let outputData =
      'RESPONSE:\n' + err.response.body
        ? JSON.stringify(err.response.body, null, 2)
        : err.response.text;

    if (err.response.request) {
      const { url = '', method = '', _data = '' } = err.response.request;

      outputData += `\nREQUEST:
${method}  ${url}
${JSON.stringify(_data, null, 2)}
`;
    }

    log.error(outputData);
  }

  return this ?? err;
};
logErrorDetails.ignoreCodes = (codes) => {
  return function (err) {
    if (err.response && err.response.status && !codes.includes(err.response.status)) {
      return logErrorDetails.call(this, err);
    }
    return this;
  };
};

/**
 * The sub action connector is defined here
 * x-pack/test/alerting_api_integration/common/plugins/alerts/server/sub_action_connector.ts
 */
const createSubActionConnector = async ({
  supertest,
  config,
  secrets = DEFAULT_SECRETS,
  connectorTypeId = 'test.sub-action-connector',
  expectedHttpCode = 200,
  errorLogger = logErrorDetails,
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  config?: Record<string, unknown>;
  secrets?: Record<string, unknown>;
  connectorTypeId?: string;
  expectedHttpCode?: number;
  errorLogger?: (err: any) => void;
}) => {
  const response = await supertest
    .post(`${getUrlPrefix('default')}/api/actions/connector`)
    .set('kbn-xsrf', 'foo')
    .on('error', errorLogger)
    .send({
      name: 'My sub connector',
      connector_type_id: connectorTypeId,
      config: {
        url: 'https://example.com',
        ...config,
      },
      secrets,
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
  username = 'elastic',
  password = 'changeme',
  errorLogger = logErrorDetails,
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  connectorId: string;
  subAction: string;
  subActionParams: Record<string, unknown>;
  expectedHttpCode?: number;
  username?: string;
  password?: string;
  errorLogger?: (err: any) => void;
}) => {
  const response = await supertest
    .post(`${getUrlPrefix('default')}/api/actions/connector/${connectorId}/_execute`)
    .set('kbn-xsrf', 'foo')
    .on('error', errorLogger)
    .auth(username, password)
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
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const securityService = getService('security');

  log = getService('log');

  describe('Sub action framework', () => {
    const objectRemover = new ObjectRemover(supertest);
    after(() => objectRemover.removeAll());

    describe('Create', () => {
      it('creates the sub action connector correctly', async () => {
        const res = await createSubActionConnector({ supertest });
        objectRemover.add('default', res.body.id, 'action', 'actions');

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
          errorLogger: logErrorDetails.ignoreCodes([400]),
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
          secrets: { ...DEFAULT_SECRETS, foo: 'foo' },
          expectedHttpCode: 400,
          errorLogger: logErrorDetails.ignoreCodes([400]),
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
        objectRemover.add('default', res.body.id, 'action', 'actions');

        const execRes = await executeSubAction({
          supertest,
          connectorId: res.body.id as string,
          subAction: 'subActionWithParams',
          subActionParams: { id: 'test-id' },
        });

        expect(execRes.body).to.eql({
          status: 'ok',
          data: { id: 'test-id' },
          connector_id: res.body.id,
        });
      });

      it('validates the subParams correctly', async () => {
        const res = await createSubActionConnector({ supertest });
        objectRemover.add('default', res.body.id, 'action', 'actions');

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
          service_message:
            'Request validation failed (Error: [id]: expected value of type [string] but got [undefined])',
        });
      });

      it('validates correctly if the subActionParams is not an object', async () => {
        const res = await createSubActionConnector({ supertest });
        objectRemover.add('default', res.body.id, 'action', 'actions');

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
          });
        }
      });

      it('should execute correctly without schema validation', async () => {
        const res = await createSubActionConnector({ supertest });
        objectRemover.add('default', res.body.id, 'action', 'actions');

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
        objectRemover.add('default', res.body.id, 'action', 'actions');

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
        objectRemover.add('default', res.body.id, 'action', 'actions');

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
          service_message: `Sub action \"notRegistered\" is not registered. Connector id: ${res.body.id}. Connector name: Test: Sub action connector. Connector type: test.sub-action-connector`,
        });
      });

      it('should return an error if the registered method is not a function', async () => {
        const res = await createSubActionConnector({ supertest });
        objectRemover.add('default', res.body.id, 'action', 'actions');

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
          service_message: `Method \"notAFunction\" does not exists in service. Sub action: \"notAFunction\". Connector id: ${res.body.id}. Connector name: Test: Sub action connector. Connector type: test.sub-action-connector`,
        });
      });

      it('should return an error if the registered method does not exists', async () => {
        const res = await createSubActionConnector({ supertest });
        objectRemover.add('default', res.body.id, 'action', 'actions');

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
          service_message: `Method \"notExist\" does not exists in service. Sub action: \"notExist\". Connector id: ${res.body.id}. Connector name: Test: Sub action connector. Connector type: test.sub-action-connector`,
        });
      });

      it('should return an error if there are no sub actions registered', async () => {
        const res = await createSubActionConnector({
          supertest,
          connectorTypeId: 'test.sub-action-connector-without-sub-actions',
        });
        objectRemover.add('default', res.body.id, 'action', 'actions');

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
          service_message: 'You should register at least one subAction for your connector type',
        });
      });

      describe('SentinelOne Connector sub-actions authz', () => {
        interface CreatedUser {
          username: string;
          password: string;
          deleteUser: () => Promise<void>;
        }

        // SentinelOne supported sub-actions and associated Security Solution kibana privilege needed
        const s1SubActions = {
          [SUB_ACTION.KILL_PROCESS]: [SECURITY_PRIVILEGE_ID.processOperationsAll],
          [SUB_ACTION.GET_AGENTS]: [SECURITY_PRIVILEGE_ID.endpointListRead],
          [SUB_ACTION.ISOLATE_AGENT]: [SECURITY_PRIVILEGE_ID.hostIsolationAll],
          [SUB_ACTION.RELEASE_AGENT]: [SECURITY_PRIVILEGE_ID.hostIsolationAll],
          [SUB_ACTION.GET_REMOTE_SCRIPT_STATUS]: [
            SECURITY_PRIVILEGE_ID.responseActionsHistoryLogRead,
          ],
          [SUB_ACTION.GET_REMOTE_SCRIPT_RESULTS]: [
            SECURITY_PRIVILEGE_ID.responseActionsHistoryLogRead,
          ],
        };

        let connectorId: string;

        const createUser = async ({
          username,
          password = 'changeme',
          siemPrivileges = [],
        }: {
          username: string;
          password?: string;
          siemPrivileges?: string[];
        }): Promise<CreatedUser> => {
          const role: Role = {
            name: username,
            elasticsearch: {
              cluster: [],
              indices: [],
              run_as: [],
            },
            kibana: [
              {
                base: [],
                feature: {
                  siem: ['minimal_all', ...siemPrivileges],
                  actions: ['all'],
                },
                spaces: ['*'],
              },
            ],
          };

          await securityService.role.create(role.name, {
            kibana: role.kibana,
            elasticsearch: role.elasticsearch,
          });

          await securityService.user.create(username, {
            password: 'changeme',
            full_name: role.name,
            roles: [role.name],
          });

          return {
            username,
            password,
            deleteUser: async () => {
              await securityService.user.delete(role.name);
              await securityService.role.delete(role.name);
            },
          };
        };

        before(async () => {
          connectorId = await (
            await createSubActionConnector({
              supertest,
              connectorTypeId: SENTINELONE_CONNECTOR_ID,
              config: { url: 'https://some.non.existent.com' },
              secrets: { token: 'abc-123' },
            })
          ).body.id;
        });

        after(async () => {
          if (connectorId) {
            await supertest
              .delete(`${getUrlPrefix('default')}/api/actions/connector/${connectorId}`)
              .set('kbn-xsrf', 'true')
              .send()
              .expect(({ ok, status }) => {
                // Should cover all success codes (ex. 204 (no content), 200, etc...)
                if (!ok) {
                  throw new Error(
                    `Expected delete to return a status code in the 200, but got ${status}`
                  );
                }
              });

            connectorId = '';
          }
        });

        describe('and user has NO privileges', () => {
          let user: CreatedUser;

          before(async () => {
            user = await createUser({ username: 'base_user' });
          });

          after(async () => {
            if (user) {
              await user.deleteUser();
            }
          });

          for (const s1SubAction of Object.keys(s1SubActions)) {
            it(`should deny execute of ${s1SubAction}`, async () => {
              const execRes = await executeSubAction({
                supertest: supertestWithoutAuth,
                connectorId,
                subAction: s1SubAction,
                subActionParams: {},
                username: user.username,
                password: user.password,
              });

              expect(execRes.body).to.eql({
                status: 'error',
                message: 'Unauthorized to execute actions',
                retry: false,
                connector_id: connectorId,
              });
            });
          }
        });

        describe('and user has proper privileges', () => {
          let user: CreatedUser;

          afterEach(async () => {
            if (user) {
              await user.deleteUser();
              // @ts-expect-error
              user = undefined;
            }
          });

          for (const [s1SubAction, siemPrivileges] of Object.entries(s1SubActions)) {
            it(`should allow execute of ${s1SubAction}`, async () => {
              user = await createUser({ username: s1SubAction.toLowerCase(), siemPrivileges });

              const {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                body: { status, message, connector_id },
              } = await executeSubAction({
                supertest: supertestWithoutAuth,
                connectorId,
                subAction: s1SubAction,
                subActionParams: {},
                username: user.username,
                password: user.password,
              });

              expect({ status, message, connector_id }).to.eql({
                status: 'error',
                message: 'an error occurred while running the action',
                connector_id: connectorId,
              });
            });
          }
        });
      });
    });
  });
}
