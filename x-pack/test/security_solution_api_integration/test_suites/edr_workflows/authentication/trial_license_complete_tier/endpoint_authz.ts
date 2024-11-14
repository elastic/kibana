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
  BASE_ENDPOINT_ACTION_ROUTE,
  BASE_POLICY_RESPONSE_ROUTE,
  EXECUTE_ROUTE,
  GET_FILE_ROUTE,
  GET_PROCESSES_ROUTE,
  HOST_METADATA_GET_ROUTE,
  HOST_METADATA_LIST_ROUTE,
  ISOLATE_HOST_ROUTE_V2,
  KILL_PROCESS_ROUTE,
  METADATA_TRANSFORMS_STATUS_INTERNAL_ROUTE,
  SUSPEND_PROCESS_ROUTE,
  UNISOLATE_HOST_ROUTE_V2,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import { IndexedHostsAndAlertsResponse } from '@kbn/security-solution-plugin/common/endpoint/index_data';
import TestAgent from 'supertest/lib/agent';
import { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';
import { ROLE } from '../../../../config/services/security_solution_edr_workflows_roles_users';

export default function ({ getService }: FtrProviderContext) {
  const endpointTestResources = getService('endpointTestResources');
  const utils = getService('securitySolutionUtils');
  const samlAuth = getService('samlAuth');

  interface ApiCallsInterface {
    method: keyof Pick<TestAgent, 'post' | 'get'>;
    path: string;
    version?: string;
    body: Record<string, unknown> | (() => Record<string, unknown>) | undefined;
  }
  // @skipInServerlessMKI - this test uses internal index manipulation in before/after hooks
  // @skipInServerlessMKI - if you are removing this annotation, make sure to add the test suite to the MKI pipeline in .buildkite/pipelines/security_solution_quality_gate/mki_periodic/mki_periodic_defend_workflows.yml
  describe('@ess @serverless @skipInServerlessMKI When attempting to call an endpoint api', function () {
    let indexedData: IndexedHostsAndAlertsResponse;
    let actionId = '';
    let agentId = '';

    const canReadSecuritySolutionApiList: ApiCallsInterface[] = [
      {
        method: 'get',
        path: ACTION_DETAILS_ROUTE,
        body: undefined,
        version: '2023-10-31',
      },
      {
        method: 'get',
        path: `${ACTION_STATUS_ROUTE}?agent_ids=1,2`,
        version: '2023-10-31',
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
        path: METADATA_TRANSFORMS_STATUS_INTERNAL_ROUTE,
        version: '1',
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
        path: BASE_ENDPOINT_ACTION_ROUTE,
        body: undefined,
        version: '2023-10-31',
      },
    ];

    const canIsolateHostApiList: ApiCallsInterface[] = [
      {
        method: 'post',
        path: ISOLATE_HOST_ROUTE_V2,
        body: () => ({ endpoint_ids: [agentId] }),
        version: '2023-10-31',
      },
      {
        method: 'post',
        path: UNISOLATE_HOST_ROUTE_V2,
        body: () => ({ endpoint_ids: [agentId] }),
        version: '2023-10-31',
      },
    ];

    const canWriteProcessOperationsApiList: ApiCallsInterface[] = [
      {
        method: 'post',
        path: GET_PROCESSES_ROUTE,
        body: () => ({ endpoint_ids: [agentId] }),
        version: '2023-10-31',
      },
      {
        method: 'post',
        path: KILL_PROCESS_ROUTE,
        body: () => ({ endpoint_ids: [agentId], parameters: { entity_id: 'abc123' } }),
        version: '2023-10-31',
      },
      {
        method: 'post',
        path: SUSPEND_PROCESS_ROUTE,
        body: () => ({ endpoint_ids: [agentId], parameters: { entity_id: 'abc123' } }),
        version: '2023-10-31',
      },
    ];

    const canWriteFileOperationsApiList: ApiCallsInterface[] = [
      {
        method: 'post',
        path: GET_FILE_ROUTE,
        body: () => ({ endpoint_ids: [agentId], parameters: { path: '/opt/file/doc.txt' } }),
        version: '2023-10-31',
      },
    ];

    const canWriteExecuteOperationsApiList: ApiCallsInterface[] = [
      {
        method: 'post',
        path: EXECUTE_ROUTE,
        version: '2023-10-31',
        body: () => ({ endpoint_ids: [agentId], parameters: { command: 'ls -la' } }),
      },
    ];

    function replacePathIds(path: string) {
      return path.replace('{action_id}', actionId).replace('{agentId}', agentId);
    }

    function getBodyPayload(apiCall: ApiCallsInterface): ApiCallsInterface['body'] {
      return typeof apiCall.body === 'function' ? apiCall.body() : apiCall.body;
    }

    let adminSupertest: TestAgent;
    let t1AnalystSupertest: TestAgent;
    let endpointOperationsAnalystSupertest: TestAgent;
    let platformEnginnerSupertest: TestAgent;
    before(async () => {
      adminSupertest = await utils.createSuperTest();
      t1AnalystSupertest = await utils.createSuperTest(ROLE.t1_analyst);
      endpointOperationsAnalystSupertest = await utils.createSuperTest(
        ROLE.endpoint_operations_analyst
      );
      platformEnginnerSupertest = await utils.createSuperTest(ROLE.platform_engineer);

      indexedData = await endpointTestResources.loadEndpointData();
      agentId = indexedData.hosts[0].agent.id;
      actionId = indexedData.actions[0].action_id;
    });

    after(async () => {
      await endpointTestResources.unloadEndpointData(indexedData);
    });

    describe('with minimal_all', () => {
      for (const apiListItem of [
        ...canReadActionsLogManagementApiList,
        ...canIsolateHostApiList,
        ...canWriteProcessOperationsApiList,
      ]) {
        it(`should return 403 when [${apiListItem.method.toUpperCase()} ${
          apiListItem.path
        }]`, async () => {
          await t1AnalystSupertest[apiListItem.method](replacePathIds(apiListItem.path))
            .set('kbn-xsrf', 'xxx')
            .set(apiListItem.version ? 'Elastic-Api-Version' : 'foo', '2023-10-31')
            .send(getBodyPayload(apiListItem))
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
          await t1AnalystSupertest[apiListItem.method](replacePathIds(apiListItem.path))
            .set('kbn-xsrf', 'xxx')
            .set(
              apiListItem.version ? 'Elastic-Api-Version' : 'foo',
              apiListItem.version || '2023-10-31'
            )
            .set(samlAuth.getInternalRequestHeader())
            .send(getBodyPayload(apiListItem))
            .expect(200);
        });
      }
    });

    describe('with minimal_all and actions_log_management_read', () => {
      for (const apiListItem of [...canIsolateHostApiList, ...canWriteProcessOperationsApiList]) {
        it(`should return 403 when [${apiListItem.method.toUpperCase()} ${
          apiListItem.path
        }]`, async () => {
          await platformEnginnerSupertest[apiListItem.method](replacePathIds(apiListItem.path))
            .set('kbn-xsrf', 'xxx')
            .send(getBodyPayload(apiListItem))
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
          await platformEnginnerSupertest[apiListItem.method](replacePathIds(apiListItem.path))
            .set('kbn-xsrf', 'xxx')
            .set(
              apiListItem.version ? 'Elastic-Api-Version' : 'foo',
              apiListItem.version || '2023-10-31'
            )
            .set(samlAuth.getInternalRequestHeader())
            .send(getBodyPayload(apiListItem))
            .expect(200);
        });
      }
    });

    describe('with minimal_all, actions_log_management_all, host_isolation_all, and process_operations_all', () => {
      for (const apiListItem of [
        ...canReadSecuritySolutionApiList,
        ...canReadActionsLogManagementApiList,
        ...canIsolateHostApiList,
        ...canWriteProcessOperationsApiList,
      ]) {
        it(`should return 200 when [${apiListItem.method.toUpperCase()} ${
          apiListItem.path
        }]`, async () => {
          await endpointOperationsAnalystSupertest[apiListItem.method](
            replacePathIds(apiListItem.path)
          )
            .set(
              apiListItem.version ? 'Elastic-Api-Version' : 'foo',
              apiListItem.version || '2023-10-31'
            )
            .set(samlAuth.getInternalRequestHeader())
            .set('kbn-xsrf', 'xxx')
            .send(getBodyPayload(apiListItem))
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
        ...canWriteExecuteOperationsApiList,
        ...canWriteFileOperationsApiList,
      ]) {
        it(`should return 200 when [${apiListItem.method.toUpperCase()} ${
          apiListItem.path
        }]`, async () => {
          await adminSupertest[apiListItem.method](replacePathIds(apiListItem.path))
            .set('kbn-xsrf', 'xxx')
            .set(
              apiListItem.version ? 'Elastic-Api-Version' : 'foo',
              apiListItem.version || '2023-10-31'
            )
            .set(samlAuth.getInternalRequestHeader())
            .send(getBodyPayload(apiListItem))
            .expect(200);
        });
      }
    });
  });
}
