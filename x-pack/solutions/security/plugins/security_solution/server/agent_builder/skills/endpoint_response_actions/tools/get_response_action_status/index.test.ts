/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isToolHandlerStandardReturn,
  type ToolHandlerContext,
  type ToolHandlerReturn,
  type ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';

import { getEndpointAuthzInitialStateMock } from '../../../../../../common/endpoint/service/authz/mocks';
import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { createMockEndpointAppContext } from '../../../../../endpoint/mocks';
import { NotFoundError } from '../../../../../endpoint/errors';
import { getActionDetailsById } from '../../../../../endpoint/services/actions';
import { GET_RESPONSE_ACTION_STATUS_TOOL_ID } from '../..';
import { getResponseActionStatusTool } from '.';

jest.mock('../../../../../endpoint/services/actions', () => {
  const original = jest.requireActual('../../../../../endpoint/services/actions');
  return {
    ...original,
    getActionDetailsById: jest.fn(),
  };
});

const mockGetActionDetailsById = getActionDetailsById as jest.Mock;

const mockLogger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };
const mockContext = {
  logger: mockLogger,
  spaceId: 'default',
  request: {},
} as unknown as ToolHandlerContext;

const ACTION_ID = '8d043de1-a9ea-4dc9-ae41-2a5ff7dc693e';

function assertStandardReturn(result: unknown) {
  if (!isToolHandlerStandardReturn(result as ToolHandlerReturn)) {
    throw new Error('Expected standard tool return');
  }
  return (result as ToolHandlerStandardReturn).results;
}

describe('getResponseActionStatusTool', () => {
  let service: EndpointAppContextService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createMockEndpointAppContext().service;
  });

  it('returns a valid read-only builtin tool definition', () => {
    const tool = getResponseActionStatusTool(service);
    expect(tool.type).toBe(ToolType.builtin);
    expect(tool.id).toBe(GET_RESPONSE_ACTION_STATUS_TOOL_ID);
    expect(GET_RESPONSE_ACTION_STATUS_TOOL_ID).toBe(
      'endpoint-response-actions.get_response_action_status'
    );
    expect(tool.description).toContain('action ID');
  });

  it('returns insufficient_privileges when caller lacks canAccessEndpointActionsLogManagement', async () => {
    service.getEndpointAuthz = jest.fn().mockResolvedValue(
      getEndpointAuthzInitialStateMock({
        canAccessEndpointActionsLogManagement: false,
      })
    );

    const tool = getResponseActionStatusTool(service);
    const result = await tool.handler({ actionId: ACTION_ID }, mockContext);

    const results = assertStandardReturn(result);
    expect(results[0].type).toBe(ToolResultType.error);
    const denialData = results[0].data as Record<string, unknown>;
    expect(denialData.error).toBe('insufficient_privileges');
    expect(denialData.privilege).toBe('canAccessEndpointActionsLogManagement');
    expect(mockGetActionDetailsById).not.toHaveBeenCalled();
  });

  it('returns found: false with reason action_not_found when the action id does not exist', async () => {
    mockGetActionDetailsById.mockRejectedValue(
      new NotFoundError(`Action with id '${ACTION_ID}' not found.`)
    );

    const tool = getResponseActionStatusTool(service);
    const result = await tool.handler({ actionId: ACTION_ID }, mockContext);

    const results = assertStandardReturn(result);
    expect(results[0].type).toBe(ToolResultType.other);
    const data = results[0].data as Record<string, unknown>;
    expect(data.found).toBe(false);
    expect(data.reason).toBe('action_not_found');
    expect(data.actionId).toBe(ACTION_ID);
  });

  it('returns action details when the action exists', async () => {
    mockGetActionDetailsById.mockResolvedValue({
      id: ACTION_ID,
      command: 'scan',
      status: 'successful',
      wasSuccessful: true,
      isCompleted: true,
      wasCanceled: false,
      hosts: { 'agent-123': { name: 'pr-272111-defend-demo' } },
      parameters: { path: '/usr' },
      outputs: { 'agent-123': { type: 'json', content: { code: 'success' } } },
      startedAt: '2026-07-13T14:10:00.000Z',
      completedAt: '2026-07-13T14:12:00.000Z',
      createdBy: 'admin',
      comment: 'Analyst requested malware scan',
      agentType: 'endpoint',
    });

    const tool = getResponseActionStatusTool(service);
    const result = await tool.handler({ actionId: ACTION_ID }, mockContext);

    const results = assertStandardReturn(result);
    expect(results[0].type).toBe(ToolResultType.other);
    const data = results[0].data as Record<string, unknown>;
    expect(data.kind).toBe('response_action_result');
    expect(data.found).toBe(true);
    expect(data.actionId).toBe(ACTION_ID);
    expect(data.command).toBe('scan');
    expect(data.status).toBe('successful');
    expect(data.wasSuccessful).toBe(true);
    expect(data.isCompleted).toBe(true);
    expect(mockGetActionDetailsById).toHaveBeenCalledWith(service, 'default', ACTION_ID);
  });

  it('returns ToolResultType.error for unexpected lookup failures', async () => {
    mockGetActionDetailsById.mockRejectedValue(new Error('Elasticsearch unavailable'));

    const tool = getResponseActionStatusTool(service);
    const result = await tool.handler({ actionId: ACTION_ID }, mockContext);

    const results = assertStandardReturn(result);
    expect(results[0].type).toBe(ToolResultType.error);
    expect((results[0].data as Record<string, unknown>).message).toContain(
      'Error retrieving response action status'
    );
  });
});
