/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wrapErrorAndRejectPromise } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/utils';
import {
  ACTION_DETAILS_ROUTE,
  ACTION_STATUS_ROUTE,
  AGENT_POLICY_SUMMARY_ROUTE,
  BASE_POLICY_RESPONSE_ROUTE,
  ENDPOINTS_ACTION_LIST_ROUTE,
  GET_PROCESSES_ROUTE,
  HOST_METADATA_GET_ROUTE,
  HOST_METADATA_LIST_ROUTE,
  ISOLATE_HOST_ROUTE_V2,
  KILL_PROCESS_ROUTE,
  METADATA_TRANSFORMS_STATUS_ROUTE,
  SUSPEND_PROCESS_ROUTE,
  UNISOLATE_HOST_ROUTE_V2,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import { IndexedHostsAndAlertsResponse } from '@kbn/security-solution-plugin/common/endpoint/index_data';
import { FtrProviderContext } from '../ftr_provider_context';
import { ROLE } from '../services/roles_users';

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const endpointTestResources = getService('endpointTestResources');

  interface ApiCallsInterface {
    method: keyof Pick<typeof supertest, 'post' | 'get'>;
    path: string;
    body: Record<string, unknown> | undefined;
  }

  describe('When attempting to call an endpoint api', () => {
    let indexedData: IndexedHostsAndAlertsResponse;
    let actionId = '';
    let agentId = '';

    const canReadSecuritySolutionApiList: ApiCallsInterface[] = [
      {
        method: 'get',
        path: ACTION_DETAILS_ROUTE,
        body: undefined,
      },
      {
        method: 'get',
        path: `${ACTION_STATUS_ROUTE}?agent_ids=1,2`,
        body: undefined,
      },
      {
        method: 'get',
        path: HOST_METADATA_LIST_ROUTE,
        body: undefined,
      },
      {
        method: 'get',
        path: HOST_METADATA_GET_ROUTE.replace('{id}', '{agentId}'),
        body: undefined,
      },
      {
        method: 'get',
        path: METADATA_TRANSFORMS_STATUS_ROUTE,
        body: undefined,
      },
      {
        method: 'get',
        path: `${BASE_POLICY_RESPONSE_ROUTE}?agentId={agentId}`,
        body: undefined,
      },
    ];

    const canReadActionsLogManagementApiList: ApiCallsInterface[] = [
      {
        method: 'get',
        path: ENDPOINTS_ACTION_LIST_ROUTE,
        body: undefined,
      },
    ];

    const canIsolateHostApiList: ApiCallsInterface[] = [
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
    ];

    const canWriteProcessOperationsApiList: ApiCallsInterface[] = [
      {
        method: 'post',
        path: GET_PROCESSES_ROUTE,
        body: { endpoint_ids: ['one'] },
      },
      {
        method: 'post',
        path: KILL_PROCESS_ROUTE,
        body: { endpoint_ids: ['one'], parameters: { entity_id: 'abc123' } },
      },
      {
        method: 'post',
        path: SUSPEND_PROCESS_ROUTE,
        body: { endpoint_ids: ['one'], parameters: { entity_id: 'abc123' } },
      },
    ];

    const superuserApiList: ApiCallsInterface[] = [
      {
        method: 'get',
        path: `${AGENT_POLICY_SUMMARY_ROUTE}?package_name=endpoint`,
        body: undefined,
      },
    ];

    function replacePathIds(path: string) {
      return path.replace('{action_id}', actionId).replace('{agentId}', agentId);
    }

    before(async () => {
      indexedData = await endpointTestResources.loadEndpointData();
      agentId = indexedData.hosts[0].agent.id;
      actionId = indexedData.actions[0].action_id;
    });

    after(() => {
      endpointTestResources.unloadEndpointData(indexedData);
    });

    describe('with minimal_all', () => {
      for (const apiListItem of [
        ...canReadActionsLogManagementApiList,
        ...canIsolateHostApiList,
        ...canWriteProcessOperationsApiList,
        ...superuserApiList,
      ]) {
        it(`should return 403 when [${apiListItem.method.toUpperCase()} ${
          apiListItem.path
        }]`, async () => {
          await supertestWithoutAuth[apiListItem.method](replacePathIds(apiListItem.path))
            .auth(ROLE.t1_analyst, 'changeme')
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

      for (const apiListItem of canReadSecuritySolutionApiList) {
        it(`should return 200 when [${apiListItem.method.toUpperCase()} ${
          apiListItem.path
        }]`, async () => {
          await supertestWithoutAuth[apiListItem.method](replacePathIds(apiListItem.path))
            .auth(ROLE.t1_analyst, 'changeme')
            .set('kbn-xsrf', 'xxx')
            .send(apiListItem.body)
            .expect(200);
        });
      }
    });

    describe('with minimal_all and actions_log_management_read', () => {
      for (const apiListItem of [
        ...canIsolateHostApiList,
        ...canWriteProcessOperationsApiList,
        ...superuserApiList,
      ]) {
        it(`should return 403 when [${apiListItem.method.toUpperCase()} ${
          apiListItem.path
        }]`, async () => {
          await supertestWithoutAuth[apiListItem.method](replacePathIds(apiListItem.path))
            .auth(ROLE.platform_engineer, 'changeme')
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

      for (const apiListItem of [
        ...canReadSecuritySolutionApiList,
        ...canReadActionsLogManagementApiList,
      ]) {
        it(`should return 200 when [${apiListItem.method.toUpperCase()} ${
          apiListItem.path
        }]`, async () => {
          await supertestWithoutAuth[apiListItem.method](replacePathIds(apiListItem.path))
            .auth(ROLE.platform_engineer, 'changeme')
            .set('kbn-xsrf', 'xxx')
            .send(apiListItem.body)
            .expect(200);
        });
      }
    });

    describe('with minimal_all, actions_log_management_all, host_isolation_all, and process_operations_all', () => {
      for (const apiListItem of superuserApiList) {
        it(`should return 403 when [${apiListItem.method.toUpperCase()} ${
          apiListItem.path
        }]`, async () => {
          await supertestWithoutAuth[apiListItem.method](replacePathIds(apiListItem.path))
            .auth(ROLE.analyst_hunter, 'changeme')
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

      for (const apiListItem of [
        ...canReadSecuritySolutionApiList,
        ...canReadActionsLogManagementApiList,
        ...canIsolateHostApiList,
        ...canWriteProcessOperationsApiList,
      ]) {
        it(`should return 200 when [${apiListItem.method.toUpperCase()} ${
          apiListItem.path
        }]`, async () => {
          await supertestWithoutAuth[apiListItem.method](replacePathIds(apiListItem.path))
            .auth(ROLE.analyst_hunter, 'changeme')
            .set('kbn-xsrf', 'xxx')
            .send(apiListItem.body)
            .expect(200);
        });
      }
    });

    describe('with superuser', () => {
      for (const apiListItem of [
        ...canReadSecuritySolutionApiList,
        ...canReadActionsLogManagementApiList,
        ...canIsolateHostApiList,
        ...canWriteProcessOperationsApiList,
        ...superuserApiList,
      ]) {
        it(`should return 200 when [${apiListItem.method.toUpperCase()} ${
          apiListItem.path
        }]`, async () => {
          await supertest[apiListItem.method](replacePathIds(apiListItem.path))
            .set('kbn-xsrf', 'xxx')
            .send(apiListItem.body)
            .expect(200);
        });
      }
    });
  });
}
