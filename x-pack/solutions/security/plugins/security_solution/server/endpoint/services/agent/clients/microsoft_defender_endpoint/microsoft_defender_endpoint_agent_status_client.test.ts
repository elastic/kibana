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
import { MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION } from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/constants';
import type { ActionsClientMock } from '@kbn/actions-plugin/server/mocks';

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
      spaceId: 'default',
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

    expect(getPendingActionsSummaryMock).toHaveBeenCalledWith(expect.anything(), 'default', [
      '1-2-3',
      'foo',
    ]);
  });

  it('should return the expected agent status records', async () => {
    await expect(msAgentStatusClientMock.getAgentStatuses(['1-2-3', 'foo'])).resolves.toEqual({
      '1-2-3': {
        agentId: '1-2-3',
        agentType: 'microsoft_defender_endpoint',
        found: true,
        isolated: true,
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
        isolated: true, // << This is only true because of the way the default mock is setup. The important value for this test data `found: false`
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
      responseActionsClientMock.setConnectorActionsClientExecuteResponse(
        clientConstructorOptions.connectorActionsClient! as ActionsClientMock,
        MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_AGENT_LIST,
        microsoftDefenderMock.createMicrosoftGetMachineListApiResponse({
          healthStatus: msHealthStatus,
        })
      );

      await expect(msAgentStatusClientMock.getAgentStatuses(['1-2-3'])).resolves.toEqual({
        '1-2-3': expect.objectContaining({
          status: expectedAgentStatus,
        }),
      });
    }
  );

  it('should retrieve the last successful isolate/release action from MS', async () => {
    await msAgentStatusClientMock.getAgentStatuses(['1-2-3']);

    expect(clientConstructorOptions.connectorActionsClient?.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        params: {
          subAction: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTIONS,
          subActionParams: {
            status: 'Succeeded',
            type: ['Isolate', 'Unisolate'],
            machineId: '1-2-3',
            pageSize: 1,
            sortField: 'lastUpdateDateTimeUtc',
            sortDirection: 'desc',
          },
        },
      })
    );
  });

  it.each`
    title                                  | msMachineActionsResponse                                                    | expectedIsolatedValue
    ${'last success action was Isolate'}   | ${microsoftDefenderMock.createGetActionsApiResponse({ type: 'Isolate' })}   | ${true}
    ${'last success action was Unisolate'} | ${microsoftDefenderMock.createGetActionsApiResponse({ type: 'Unisolate' })} | ${false}
    ${'no isolation records are found'}    | ${{ value: [] }}                                                            | ${false}
    ${'when ms API throws an error'}       | ${new Error('foo')}                                                         | ${false}
  `(
    `should display isolated:$expectedIsolatedValue when $title`,
    async ({ msMachineActionsResponse, expectedIsolatedValue }) => {
      responseActionsClientMock.setConnectorActionsClientExecuteResponse(
        clientConstructorOptions.connectorActionsClient! as ActionsClientMock,
        MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTIONS,
        () => {
          if (msMachineActionsResponse instanceof Error) {
            throw msMachineActionsResponse;
          }
          return msMachineActionsResponse;
        }
      );

      await expect(msAgentStatusClientMock.getAgentStatuses(['1-2-3'])).resolves.toEqual({
        '1-2-3': expect.objectContaining({ isolated: expectedIsolatedValue }),
      });
    }
  );
});
