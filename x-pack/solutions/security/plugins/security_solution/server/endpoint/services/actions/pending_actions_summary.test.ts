/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getActionList as _getActionList } from './action_list';
import { getPendingActionsSummary } from './pending_actions_summary';
import { createMockEndpointAppContextService } from '../../mocks';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { EndpointMetadataGenerator } from '../../../../common/endpoint/data_generators/endpoint_metadata_generator';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';
import type { ResponseActionsApiCommandNames } from '../../../../common/endpoint/service/response_actions/constants';

jest.mock('./action_list');

const getActionListMock = _getActionList as jest.Mock;

describe('getPendingActionsSummary()', () => {
  const agentId = 'agent-a';

  let endpointService: EndpointAppContextService;
  let findHostMetadataForFleetAgentsMock: jest.Mock;
  /** Recent enough that `PENDING_ACTION_RESPONSE_MAX_LAPSED_TIME` has not expired */
  let actionCompletedAt: string;

  /** Latest endpoint metadata document for `agentId`, shipped `msBeforeAction` ms before the action completed */
  const setEndpointMetadata = ({
    isolation,
    msBeforeAction,
  }: {
    isolation?: boolean;
    msBeforeAction: number;
  }): void => {
    findHostMetadataForFleetAgentsMock.mockResolvedValue([
      new EndpointMetadataGenerator('seed').generate({
        elastic: { agent: { id: agentId } },
        event: { created: new Date(actionCompletedAt).getTime() - msBeforeAction },
        Endpoint: { state: { isolation } },
      }),
    ]);
  };

  const setCompletedAction = (command: ResponseActionsApiCommandNames): void => {
    getActionListMock.mockResolvedValue({
      data: [
        new EndpointActionGenerator('seed').generateActionDetails({
          agents: [agentId],
          command,
          completedAt: actionCompletedAt,
        }),
      ],
    });
  };

  beforeEach(() => {
    actionCompletedAt = new Date(Date.now() - 1000).toISOString();
    endpointService = createMockEndpointAppContextService();
    findHostMetadataForFleetAgentsMock = jest.fn().mockResolvedValue([]);
    (endpointService.getEndpointMetadataService as jest.Mock).mockReturnValue({
      findHostMetadataForFleetAgents: findHostMetadataForFleetAgentsMock,
    });
    setCompletedAction('isolate');
  });

  afterEach(() => {
    getActionListMock.mockReset();
  });

  it.each`
    command        | isolation
    ${'isolate'}   | ${true}
    ${'unisolate'} | ${false}
  `(
    'should not report a successful $command as pending when the metadata already reports its outcome',
    async ({ command, isolation }) => {
      setCompletedAction(command);
      // The endpoint ships both documents in the same burst, so the metadata that already reports
      // the action's outcome can carry an `event.created` a few ms *before* `completedAt`.
      setEndpointMetadata({ isolation, msBeforeAction: 3 });

      await expect(
        getPendingActionsSummary(endpointService, 'default', [agentId])
      ).resolves.toEqual([{ agent_id: agentId, pending_actions: {} }]);
    }
  );

  it.each`
    command        | isolation
    ${'isolate'}   | ${false}
    ${'unisolate'} | ${true}
  `(
    'should report a successful $command as pending while the metadata still disagrees',
    async ({ command, isolation }) => {
      setCompletedAction(command);
      setEndpointMetadata({ isolation, msBeforeAction: 3 });

      await expect(
        getPendingActionsSummary(endpointService, 'default', [agentId])
      ).resolves.toEqual([{ agent_id: agentId, pending_actions: { [command]: 1 } }]);
    }
  );

  it('should report as pending when the metadata never reported an isolation state', async () => {
    setEndpointMetadata({ isolation: undefined, msBeforeAction: 3 });

    await expect(getPendingActionsSummary(endpointService, 'default', [agentId])).resolves.toEqual([
      { agent_id: agentId, pending_actions: { isolate: 1 } },
    ]);
  });

  it('should not report as pending when the metadata was received after the action completed', async () => {
    setEndpointMetadata({ isolation: false, msBeforeAction: -3 });

    await expect(getPendingActionsSummary(endpointService, 'default', [agentId])).resolves.toEqual([
      { agent_id: agentId, pending_actions: {} },
    ]);
  });

  it('should report an incomplete action as pending', async () => {
    getActionListMock.mockResolvedValue({
      data: [
        new EndpointActionGenerator('seed').generateActionDetails({
          agents: [agentId],
          command: 'isolate',
          agentState: { [agentId]: { isCompleted: false } },
        }),
      ],
    });

    await expect(getPendingActionsSummary(endpointService, 'default', [agentId])).resolves.toEqual([
      { agent_id: agentId, pending_actions: { isolate: 1 } },
    ]);
  });
});
