/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wrapErrorAndRejectPromise } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/utils';
import {
  ACTION_STATUS_ROUTE,
  AGENT_POLICY_SUMMARY_ROUTE,
  BASE_POLICY_RESPONSE_ROUTE,
  GET_RUNNING_PROCESSES_ROUTE,
  HOST_METADATA_LIST_ROUTE,
  ISOLATE_HOST_ROUTE,
  ISOLATE_HOST_ROUTE_V2,
  KILL_PROCESS_ROUTE,
  SUSPEND_PROCESS_ROUTE,
  UNISOLATE_HOST_ROUTE,
  UNISOLATE_HOST_ROUTE_V2,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import { FtrProviderContext } from '../ftr_provider_context';
import {
  createUserAndRole,
  deleteUserAndRole,
  ROLES,
} from '../../common/services/security_solution';

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('When attempting to call an endpoint api with no authz', () => {
    before(async () => {
      // create role/user
      await createUserAndRole(getService, ROLES.t1_analyst);
    });

    after(async () => {
      // delete role/user
      await deleteUserAndRole(getService, ROLES.t1_analyst);
    });

    const apiList = [
      {
        method: 'get',
        path: HOST_METADATA_LIST_ROUTE,
        body: undefined,
      },
      {
        method: 'get',
        path: `${ACTION_STATUS_ROUTE}?agent_ids=1`,
        body: undefined,
      },
      {
        method: 'get',
        path: `${AGENT_POLICY_SUMMARY_ROUTE}?package_name=endpoint`,
        body: undefined,
      },
      {
        method: 'get',
        path: '/api/endpoint/action_log/one?start_date=2021-12-01&end_date=2021-12-04',
        body: undefined,
      },
      {
        method: 'get',
        path: `${BASE_POLICY_RESPONSE_ROUTE}?agentId=1`,
        body: undefined,
      },
      {
        method: 'post',
        path: ISOLATE_HOST_ROUTE,
        body: { endpoint_ids: ['one'] },
      },
      {
        method: 'post',
        path: UNISOLATE_HOST_ROUTE,
        body: { endpoint_ids: ['one'] },
      },
      {
        method: 'post',
        path: ISOLATE_HOST_ROUTE_V2,
        body: { endpoint_ids: ['one'] },
      },
      {
        method: 'post',
        path: UNISOLATE_HOST_ROUTE_V2,
        body: { endpoint_ids: ['one'] },
      },
      {
        method: 'post',
        path: GET_RUNNING_PROCESSES_ROUTE,
        body: { endpoint_ids: ['one'] },
      },
      {
        method: 'post',
        path: KILL_PROCESS_ROUTE,
        body: { endpoint_ids: ['one'], parameters: { entity_id: 1234 } },
      },
      {
        method: 'post',
        path: SUSPEND_PROCESS_ROUTE,
        body: { endpoint_ids: ['one'], parameters: { entity_id: 1234 } },
      },
    ];

    for (const apiListItem of apiList) {
      it(`should return 403 when [${apiListItem.method.toUpperCase()} ${
        apiListItem.path
      }]`, async () => {
        await supertestWithoutAuth[apiListItem.method](apiListItem.path)
          .auth(ROLES.t1_analyst, 'changeme')
          .set('kbn-xsrf', 'xxx')
          .send(apiListItem.body)
          .expect(403, {
            statusCode: 403,
            error: 'Forbidden',
            message: 'Endpoint authorization failure',
          })
          .catch(wrapErrorAndRejectPromise);
      });
    }
  });
}
