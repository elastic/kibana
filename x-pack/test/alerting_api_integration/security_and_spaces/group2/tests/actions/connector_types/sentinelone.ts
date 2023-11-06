/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_PRIVILEGE_ID } from '@kbn/security-solution-features/privileges';
import {
  SENTINELONE_CONNECTOR_ID,
  SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/sentinelone/constants';
import { Role } from '@kbn/security-plugin/common';
import SuperTest from 'supertest';
import expect from '@kbn/expect';
import { getUrlPrefix } from '../../../../../common/lib';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createSentinelOneTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const securityService = getService('security');
  const log = getService('log');

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

  describe('SentinelOne', () => {
    describe('sub-actions authz', () => {
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
        const response = await supertest
          .post(`${getUrlPrefix('default')}/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .on('error', logErrorDetails)
          .send({
            name: 'My sub connector',
            connector_type_id: SENTINELONE_CONNECTOR_ID,
            config: { url: 'https://some.non.existent.com' },
            secrets: { token: 'abc-123' },
          })
          .expect(200);

        connectorId = response.body.id;
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

      const executeSubAction = async ({
        subAction,
        subActionParams,
        expectedHttpCode = 200,
        username = 'elastic',
        password = 'changeme',
        errorLogger = logErrorDetails,
      }: {
        supertest: SuperTest.SuperTest<SuperTest.Test>;
        subAction: string;
        subActionParams: Record<string, unknown>;
        expectedHttpCode?: number;
        username?: string;
        password?: string;
        errorLogger?: (err: any) => void;
      }) => {
        return supertestWithoutAuth
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
      };

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
}
