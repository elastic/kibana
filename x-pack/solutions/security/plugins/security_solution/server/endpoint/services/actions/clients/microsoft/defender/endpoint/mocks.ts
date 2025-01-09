/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import type { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';
import {
  MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID,
  MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION,
} from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/constants';
import type {
  MicrosoftDefenderEndpointAgentListResponse,
  MicrosoftDefenderEndpointGetActionsResponse,
  MicrosoftDefenderEndpointMachine,
  MicrosoftDefenderEndpointMachineAction,
} from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/types';
import type { NormalizedExternalConnectorClient } from '../../../../..';
import { responseActionsClientMock, type ResponseActionsClientOptionsMock } from '../../../mocks';

export interface MicrosoftDefenderActionsClientOptionsMock
  extends ResponseActionsClientOptionsMock {
  connectorActions: NormalizedExternalConnectorClient;
}

const createMsDefenderClientConstructorOptionsMock = () => {
  return {
    ...responseActionsClientMock.createConstructorOptions(),
    connectorActions: responseActionsClientMock.createNormalizedExternalConnectorClient(
      createMsConnectorActionsClientMock()
    ),
  };
};

const createMsConnectorActionsClientMock = (): ActionsClientMock => {
  const client = responseActionsClientMock.createConnectorActionsClient();

  (client.getAll as jest.Mock).mockImplementation(async () => {
    const result: ConnectorWithExtraFindData[] = [
      // return a MS connector
      responseActionsClientMock.createConnector({
        actionTypeId: MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID,
        id: 'ms-connector-instance-id',
      }),
    ];

    return result;
  });

  (client.execute as jest.Mock).mockImplementation(
    async (options: Parameters<typeof client.execute>[0]) => {
      const subAction = options.params.subAction;

      // Mocks for the different connector methods
      switch (subAction) {
        case MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_AGENT_DETAILS:
          return responseActionsClientMock.createConnectorActionExecuteResponse({
            data: createMicrosoftMachineMock(),
          });

        case MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_AGENT_LIST:
          return responseActionsClientMock.createConnectorActionExecuteResponse({
            data: createMicrosoftGetMachineListApiResponseMock(),
          });

        case MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.ISOLATE_HOST:
          return responseActionsClientMock.createConnectorActionExecuteResponse({
            data: createMicrosoftMachineActionMock({ type: 'Isolate' }),
          });

        case MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.RELEASE_HOST:
          return responseActionsClientMock.createConnectorActionExecuteResponse({
            data: createMicrosoftMachineActionMock({ type: 'Unisolate' }),
          });

        case MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTIONS:
          return responseActionsClientMock.createConnectorActionExecuteResponse({
            data: {
              '@odata.context': 'some-context',
              '@odata.count': 1,
              total: 1,
              page: 1,
              pageSize: 0,
              value: [createMicrosoftMachineActionMock()],
            },
          });

        default:
          return responseActionsClientMock.createConnectorActionExecuteResponse();
      }
    }
  );

  return client;
};

const createMicrosoftMachineMock = (
  overrides: Partial<MicrosoftDefenderEndpointMachine> = {}
): MicrosoftDefenderEndpointMachine => {
  return {
    id: '1-2-3',
    computerDnsName: 'mymachine1.contoso.com',
    firstSeen: '2018-08-02T14:55:03.7791856Z',
    lastSeen: '2018-08-02T14:55:03.7791856Z',
    osPlatform: 'Windows1',
    version: '1709',
    osProcessor: 'x64',
    lastIpAddress: '172.17.230.209',
    lastExternalIpAddress: '167.220.196.71',
    osBuild: 18209,
    healthStatus: 'Active',
    rbacGroupId: '140',
    rbacGroupName: 'The-A-Team',
    riskScore: 'Low',
    exposureLevel: 'Medium',
    aadDeviceId: '80fe8ff8-2624-418e-9591-41f0491218f9',
    machineTags: ['test tag 1', 'test tag 2'],
    onboardingstatus: 'foo',
    ipAddresses: [
      { ipAddress: '1.1.1.1', macAddress: '23:a2:5t', type: '', operationalStatus: '' },
    ],
    osArchitecture: '',

    ...overrides,
  };
};

const createMicrosoftMachineActionMock = (
  overrides: Partial<MicrosoftDefenderEndpointMachineAction> = {}
): MicrosoftDefenderEndpointMachineAction => {
  return {
    id: '5382f7ea-7557-4ab7-9782-d50480024a4e',
    type: 'Isolate',
    scope: 'Selective',
    requestor: 'Analyst@TestPrd.onmicrosoft.com',
    requestorComment: 'test for docs',
    requestSource: '',
    status: 'Succeeded',
    machineId: '1-2-3',
    computerDnsName: 'desktop-test',
    creationDateTimeUtc: '2019-01-02T14:39:38.2262283Z',
    lastUpdateDateTimeUtc: '2019-01-02T14:40:44.6596267Z',
    externalID: 'abc',
    commands: ['RunScript'],
    cancellationRequestor: '',
    cancellationComment: '',
    cancellationDateTimeUtc: '',
    title: '',

    ...overrides,
  };
};

const createMicrosoftGetActionsApiResponseMock =
  (): MicrosoftDefenderEndpointGetActionsResponse => {
    return {
      '@odata.context': 'some-context',
      '@odata.count': 1,
      total: 1,
      page: 1,
      pageSize: 0,
      value: [createMicrosoftMachineActionMock()],
    };
  };

const createMicrosoftGetMachineListApiResponseMock =
  (): MicrosoftDefenderEndpointAgentListResponse => {
    return {
      '@odata.context': 'some-context',
      '@odata.count': 1,
      total: 1,
      page: 1,
      pageSize: 0,
      value: [createMicrosoftMachineMock()],
    };
  };

export const microsoftDefenderMock = {
  createConstructorOptions: createMsDefenderClientConstructorOptionsMock,
  createMsConnectorActionsClient: createMsConnectorActionsClientMock,
  createMachineAction: createMicrosoftMachineActionMock,
  createMachine: createMicrosoftMachineMock,
  createGetActionsApiResponse: createMicrosoftGetActionsApiResponseMock,
  createMicrosoftGetMachineListApiResponse: createMicrosoftGetMachineListApiResponseMock,
};
