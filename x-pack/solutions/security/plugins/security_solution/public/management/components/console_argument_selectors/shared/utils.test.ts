/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { 
  ActionListApiResponse, 
  ActionDetails, 
  ResponseActionScript 
} from '../../../../../common/endpoint/types';
import { transformPendingActionsToOptions, transformCustomScriptsToOptions } from './utils';

describe('utils', () => {
  describe('transformPendingActionsToOptions', () => {
    const mockActionDetails: ActionDetails = {
      id: 'action-123-abc',
      command: 'isolate',
      agents: ['agent-1'],
      hosts: {
        'agent-1': { name: 'test-host' },
      },
      agentState: {
        'agent-1': {
          isCompleted: false,
          wasSuccessful: false,
          errors: undefined,
          completedAt: undefined,
        },
      },
      isExpired: false,
      isCompleted: false,
      wasSuccessful: false,
      startedAt: '2023-11-01T10:00:00.000Z',
      completedAt: undefined,
      status: 'pending',
      createdBy: 'test-user',
      agentType: 'endpoint',
      errors: undefined,
    };

    const mockApiResponse: ActionListApiResponse = {
      page: 1,
      pageSize: 10,
      total: 1,
      data: [mockActionDetails],
      agentTypes: [],
      elasticAgentIds: undefined,
      endDate: undefined,
      startDate: undefined,
      userIds: undefined,
      commands: undefined,
      statuses: undefined,
    };

    it('should return empty array when response is empty', () => {
      const result = transformPendingActionsToOptions([]);
      expect(result).toEqual([]);
    });

    it('should return empty array when response is null/undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(transformPendingActionsToOptions(null as any)).toEqual([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(transformPendingActionsToOptions(undefined as any)).toEqual([]);
    });

    it('should return empty array when response data is empty', () => {
      const emptyResponse: ActionListApiResponse = {
        ...mockApiResponse,
        data: [],
      };
      const result = transformPendingActionsToOptions([emptyResponse]);
      expect(result).toEqual([]);
    });

    it('should transform pending actions to options with correct label format', () => {
      const result = transformPendingActionsToOptions([mockApiResponse]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        label: 'isolate - action-123-abc',
        value: 'action-123-abc',
        checked: undefined,
      });
    });

    it('should include action details and description in options', () => {
      const result = transformPendingActionsToOptions([mockApiResponse]);

      expect(result[0]).toMatchObject({
        actionItem: mockActionDetails,
        description: expect.stringContaining('isolate on test-host by test-user at'),
      });
    });

    it('should handle selected value correctly', () => {
      const result = transformPendingActionsToOptions([mockApiResponse], 'action-123-abc');

      expect(result[0]).toMatchObject({
        label: 'isolate - action-123-abc',
        value: 'action-123-abc',
        checked: 'on',
      });
    });

    it('should handle multiple pending actions', () => {
      const secondAction: ActionDetails = {
        ...mockActionDetails,
        id: 'action-456-def',
        command: 'release',
        startedAt: '2023-11-01T11:00:00.000Z',
      };

      const multipleActionsResponse: ActionListApiResponse = {
        ...mockApiResponse,
        data: [mockActionDetails, secondAction],
        total: 2,
      };

      const result = transformPendingActionsToOptions([multipleActionsResponse]);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        label: 'isolate - action-123-abc',
        value: 'action-123-abc',
      });
      expect(result[1]).toMatchObject({
        label: 'release - action-456-def',
        value: 'action-456-def',
      });
    });

    it('should handle unknown host gracefully', () => {
      const actionWithoutHost: ActionDetails = {
        ...mockActionDetails,
        hosts: {},
      };

      const responseWithUnknownHost: ActionListApiResponse = {
        ...mockApiResponse,
        data: [actionWithoutHost],
      };

      const result = transformPendingActionsToOptions([responseWithUnknownHost]);

      expect(result[0].description).toContain('isolate on Unknown host by test-user at');
    });

    it('should handle edge cases with command names', () => {
      const edgeCaseActions: ActionDetails[] = [
        {
          ...mockActionDetails,
          id: 'short',
          command: 'get-file',
        },
        {
          ...mockActionDetails,
          id: 'very-long-action-id-that-might-cause-ui-issues-123456789',
          command: 'execute',
        },
      ];

      const edgeCaseResponse: ActionListApiResponse = {
        ...mockApiResponse,
        data: edgeCaseActions,
        total: 2,
      };

      const result = transformPendingActionsToOptions([edgeCaseResponse]);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        label: 'get-file - short',
        value: 'short',
      });
      expect(result[1]).toMatchObject({
        label: 'execute - very-long-action-id-that-might-cause-ui-issues-123456789',
        value: 'very-long-action-id-that-might-cause-ui-issues-123456789',
      });
    });

    it('should format timestamp correctly in description', () => {
      const result = transformPendingActionsToOptions([mockApiResponse]);

      // The timestamp should be formatted as a locale string
      expect(result[0].description).toMatch(/isolate on test-host by test-user at \d+\/\d+\/\d+/);
    });
  });

  describe('transformCustomScriptsToOptions', () => {
    const mockScript: ResponseActionScript = {
      id: 'script-1',
      name: 'Test Script',
      description: 'A test script for validation',
    };

    it('should transform scripts to options correctly', () => {
      const result = transformCustomScriptsToOptions([mockScript]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        label: 'Test Script',
        description: 'A test script for validation',
        data: mockScript,
        checked: undefined,
      });
    });

    it('should mark selected script as checked', () => {
      const result = transformCustomScriptsToOptions([mockScript], 'Test Script');

      expect(result[0]).toMatchObject({
        label: 'Test Script',
        checked: 'on',
      });
    });

    it('should handle empty scripts array', () => {
      const result = transformCustomScriptsToOptions([]);
      expect(result).toEqual([]);
    });
  });
});