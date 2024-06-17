/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CROWDSTRIKE_CONNECTOR_ID,
  SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/crowdstrike/constants';
import { FeaturesPrivileges, Role } from '@kbn/security-plugin/common';
import SuperTest from 'supertest';
import expect from '@kbn/expect';
import { getUrlPrefix } from '../../../../../common/lib';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { createSupertestErrorLogger } from '../../../../../common/lib/log_supertest_errors';

// eslint-disable-next-line import/no-default-export
export default function createCrowdstrikeTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const securityService = getService('security');
  const log = getService('log');
  const logErrorDetails = createSupertestErrorLogger(log);

  describe('Crowdstrike', () => {
    describe('sub-actions authz', () => {
      interface CreatedUser {
        username: string;
        password: string;
        deleteUser: () => Promise<void>;
      }

      // Crowdstrike supported sub-actions
      const crowdstrikeSubActions = [SUB_ACTION.HOST_ACTIONS, SUB_ACTION.GET_AGENT_DETAILS];

      let connectorId: string;

      const createUser = async ({
        username,
        password = 'changeme',
        kibanaFeatures = { actions: ['all'] },
      }: {
        username: string;
        password?: string;
        kibanaFeatures?: FeaturesPrivileges;
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
                // Important: Saved Objects Managemnt should be set to `all` to ensure that authz
                // is not defaulted to the check done against SO's for Crowdstrike
                savedObjectsManagement: ['all'],
                ...kibanaFeatures,
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
            connector_type_id: CROWDSTRIKE_CONNECTOR_ID,
            config: { url: 'https://some.non.existent.com' },
            secrets: { clientId: 'abc-123', clientSecret: 'test-secret' },
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
        supertest: SuperTest.Agent;
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
          user = await createUser({
            username: 'read_access_user',
            kibanaFeatures: { actions: ['read'] },
          });
        });

        after(async () => {
          if (user) {
            await user.deleteUser();
          }
        });

        for (const crowdstrikeSubAction of crowdstrikeSubActions) {
          it(`should deny execute of ${crowdstrikeSubAction}`, async () => {
            const execRes = await executeSubAction({
              supertest: supertestWithoutAuth,
              subAction: crowdstrikeSubAction,
              subActionParams: {},
              username: user.username,
              password: user.password,
              expectedHttpCode: 403,
              errorLogger: logErrorDetails.ignoreCodes([403]),
            });

            expect(execRes.body).to.eql({
              statusCode: 403,
              error: 'Forbidden',
              message: 'Unauthorized to execute a ".crowdstrike" action',
            });
          });
        }
      });

      describe('and user has proper privileges', () => {
        let user: CreatedUser;

        before(async () => {
          user = await createUser({
            username: 'all_access_user',
          });
        });

        after(async () => {
          if (user) {
            await user.deleteUser();
            // @ts-expect-error
            user = undefined;
          }
        });

        for (const crowdstrikeSubAction of crowdstrikeSubActions) {
          it(`should allow execute of ${crowdstrikeSubAction}`, async () => {
            const {
              // eslint-disable-next-line @typescript-eslint/naming-convention
              body: { status, message, connector_id },
            } = await executeSubAction({
              supertest: supertestWithoutAuth,
              subAction: crowdstrikeSubAction,
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
