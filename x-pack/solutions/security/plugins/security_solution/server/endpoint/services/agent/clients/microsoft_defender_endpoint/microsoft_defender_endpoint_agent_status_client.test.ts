/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPendingActionsSummary as _getPendingActionsSummary } from '../../..';
import { createMockEndpointAppContextService } from '../../../../mocks';
import { MicrosoftDefenderEndpointAgentStatusClient } from './microsoft_defender_endpoint_agent_status_client';
import { microsoftDefenderMock } from '../../../actions/clients/microsoft/defender/endpoint/mocks';
import type { AgentStatusClientOptions } from '../lib/base_agent_status_client';
import { HostStatus } from '../../../../../../common/endpoint/types';
import { responseActionsClientMock } from '../../../actions/clients/mocks';

jest.mock('../../../actions/pending_actions_summary', () => {
  const realModule = jest.requireActual('../../../actions/pending_actions_summary');
  return {
    ...realModule,
    getPendingActionsSummary: jest.fn(realModule.getPendingActionsSummary),
  };
});

const getPendingActionsSummaryMock = _getPendingActionsSummary as jest.Mock;

describe('Microsoft Defender Agent Status client', () => {
  let clientConstructorOptions: AgentStatusClientOptions;
  let msAgentStatusClientMock: MicrosoftDefenderEndpointAgentStatusClient;

  beforeEach(() => {
    const endpointAppContextServiceMock = createMockEndpointAppContextService();
    const soClient = endpointAppContextServiceMock.savedObjects.createInternalScopedSoClient({
      readonly: false,
    });

    getPendingActionsSummaryMock.mockResolvedValue([
      {
        agent_id: '1-2-3',
        pending_actions: { isolate: 1 },
      },
    ]);

    clientConstructorOptions = {
      endpointService: endpointAppContextServiceMock,
      connectorActionsClient: microsoftDefenderMock.createMsConnectorActionsClient(),
      esClient: endpointAppContextServiceMock.getInternalEsClient(),
      soClient,
    };

    msAgentStatusClientMock = new MicrosoftDefenderEndpointAgentStatusClient(
      clientConstructorOptions
    );
  });

  afterEach(() => {
    getPendingActionsSummaryMock.mockReset();
  });

  it('should error if instantiated with no Connector Actions Client', () => {
    clientConstructorOptions.connectorActionsClient = undefined;

    expect(() => new MicrosoftDefenderEndpointAgentStatusClient(clientConstructorOptions)).toThrow(
      'connectorActionsClient is required to create an instance of MicrosoftDefenderEndpointAgentStatusClient'
    );
  });

  it('should call connector to get list of machines from MS using the IDs passed in', async () => {
    await msAgentStatusClientMock.getAgentStatuses(['1-2-3', 'foo']);

    expect(clientConstructorOptions.connectorActionsClient?.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        params: {
          subAction: 'getAgentList',
          subActionParams: { id: ['1-2-3', 'foo'] },
        },
      })
    );
  });

  it('should retrieve a list of pending response actions with the IDs that were passed in', async () => {
    await msAgentStatusClientMock.getAgentStatuses(['1-2-3', 'foo']);

    expect(getPendingActionsSummaryMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      ['1-2-3', 'foo']
    );
  });

  it('should return the expected agent status records', async () => {
    await expect(msAgentStatusClientMock.getAgentStatuses(['1-2-3', 'foo'])).resolves.toEqual({
      '1-2-3': {
        agentId: '1-2-3',
        agentType: 'microsoft_defender_endpoint',
        found: true,
        isolated: false,
        lastSeen: '2018-08-02T14:55:03.7791856Z',
        pendingActions: {
          isolate: 1,
        },
        status: 'healthy',
      },
      foo: {
        agentId: 'foo',
        agentType: 'microsoft_defender_endpoint',
        found: false,
        isolated: false,
        lastSeen: '',
        pendingActions: {},
        status: 'unenrolled',
      },
    });
  });

  it.each`
    msHealthStatus                         | expectedAgentStatus
    ${'Active'}                            | ${HostStatus.HEALTHY}
    ${'Inactive'}                          | ${HostStatus.INACTIVE}
    ${'ImpairedCommunication'}             | ${HostStatus.UNHEALTHY}
    ${'NoSensorData'}                      | ${HostStatus.UNHEALTHY}
    ${'NoSensorDataImpairedCommunication'} | ${HostStatus.UNHEALTHY}
    ${'Unknown'}                           | ${HostStatus.UNENROLLED}
  `(
    'should correctly map MS machine healthStatus of $msHealthStatus to agent status $expectedAgentStatus',
    async ({ msHealthStatus, expectedAgentStatus }) => {
      const priorExecuteMock = (
        clientConstructorOptions.connectorActionsClient?.execute as jest.Mock
      ).getMockImplementation();
      (clientConstructorOptions.connectorActionsClient?.execute as jest.Mock).mockImplementation(
        async (options) => {
          if (options.params.subAction === 'getAgentList') {
            const machineListResponse =
              microsoftDefenderMock.createMicrosoftGetMachineListApiResponse();
            machineListResponse.value[0].healthStatus = msHealthStatus;

            return responseActionsClientMock.createConnectorActionExecuteResponse({
              data: machineListResponse,
            });
          }

          if (priorExecuteMock) {
            return priorExecuteMock(options);
          }
        }
      );

      await expect(msAgentStatusClientMock.getAgentStatuses(['1-2-3'])).resolves.toEqual({
        '1-2-3': expect.objectContaining({
          status: expectedAgentStatus,
        }),
      });
    }
  );
});
