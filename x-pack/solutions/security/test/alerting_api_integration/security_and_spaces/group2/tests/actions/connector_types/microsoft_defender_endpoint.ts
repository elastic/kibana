/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeaturesPrivileges, Role } from '@kbn/security-plugin-types-common';
import {
  CONNECTOR_ID as MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID,
  SUB_ACTION as MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION,
} from '@kbn/connector-schemas/microsoft_defender_endpoint/constants';
import type SuperTest from 'supertest';
import expect from '@kbn/expect';
import { getUrlPrefix } from '@kbn/test-suites-xpack-platform/alerting_api_integration/common/lib';
import { createSupertestErrorLogger } from '@kbn/test-suites-xpack-platform/alerting_api_integration/common/lib/log_supertest_errors';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function createMicrosoftDefenderEndpointTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const securityService = getService('security');
  const log = getService('log');
  const logErrorDetails = createSupertestErrorLogger(log);

  interface CreatedUser {
    username: string;
    password: string;
    deleteUser: () => Promise<void>;
  }

  // TODO:PT create service for user creation since this code is now duplicated across SentinelOne, Crowdstrike and here for MS Defender
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
            // is not defaulted to the check done against SO's for SentinelOne
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

  describe('Microsoft Defender for Endpoint Connector', () => {
    let connectorId: string = '';

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

    const subActions: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION[] = [
      MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.TEST_CONNECTOR,
      MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.RELEASE_HOST,
      MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.ISOLATE_HOST,
      MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_AGENT_DETAILS,
    ];

    before(async () => {
      const response = await supertest
        .post(`${getUrlPrefix('default')}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .on('error', logErrorDetails)
        .send({
          name: 'My sub connector',
          connector_type_id: MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID,
          config: {
            clientId: 'client-abc',
            tenantId: 'tenant-123',
            oAuthServerUrl: 'https://some.non.existent.com',
            oAuthScope: 'scope-a',
            apiUrl: 'https://some.non.existent.com',
          },
          secrets: { clientSecret: 'abc-123' },
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

    describe('Sub-action authz', () => {
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

        for (const subActionValue of subActions) {
          it(`should deny execute of ${subActionValue}`, async () => {
            const execRes = await executeSubAction({
              supertest: supertestWithoutAuth,
              subAction: subActionValue,
              subActionParams: {},
              username: user.username,
              password: user.password,
              expectedHttpCode: 403,
              errorLogger: logErrorDetails.ignoreCodes([403]),
            });

            expect(execRes.body).to.eql({
              statusCode: 403,
              error: 'Forbidden',
              message: `Unauthorized to execute a "${MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID}" action`,
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

        for (const subActionValue of subActions) {
          const isAllowedSubAction =
            subActionValue === MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.TEST_CONNECTOR;

          it(`should ${
            isAllowedSubAction ? 'allow' : 'deny'
          } execute of ${subActionValue}`, async () => {
            const {
              body: { status, message, connector_id, statusCode, error },
            } = await executeSubAction({
              supertest: supertestWithoutAuth,
              subAction: subActionValue,
              subActionParams: {},
              username: user.username,
              password: user.password,
              ...(isAllowedSubAction
                ? {}
                : { expectedHttpCode: 403, errorLogger: logErrorDetails.ignoreCodes([403]) }),
            });

            if (isAllowedSubAction) {
              expect({ status, message, connector_id }).to.eql({
                status: 'error',
                message: 'an error occurred while running the action',
                connector_id: connectorId,
              });
            } else {
              expect({ statusCode, message, error }).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: `Unauthorized to execute a "${MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID}" action`,
              });
            }
          });
        }
      });
    });
  });
}
