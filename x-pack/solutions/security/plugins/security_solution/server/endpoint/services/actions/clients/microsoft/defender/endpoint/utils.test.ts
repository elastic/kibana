/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MicrosoftDefenderEndpointMachineAction } from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/types';
import { checkActionMatches } from './utils';

describe('MDE validation utilities', () => {
  describe('checkActionMatches', () => {
    const createMockActionDetails = (
      overrides?: Partial<MicrosoftDefenderEndpointMachineAction>
    ): MicrosoftDefenderEndpointMachineAction => ({
      id: 'test-machine-action-id',
      type: 'LiveResponse',
      requestor: 'test@example.com',
      requestSource: 'API',
      commands: [
        {
          index: 0,
          startTime: '2025-01-30T10:00:00Z',
          endTime: '2025-01-30T10:00:10Z',
          commandStatus: 'InProgress',
          errors: [],
          command: {
            type: 'RunScript',
            params: [{ key: 'ScriptName', value: 'hello.sh' }],
          },
        },
      ],
      cancellationRequestor: '',
      requestorComment: 'Action triggered from Elastic Security (action id: kibana-action-123)',
      cancellationComment: '',
      status: 'InProgress',
      machineId: 'machine-123',
      computerDnsName: 'test-machine',
      creationDateTimeUtc: '2025-01-30T10:00:00Z',
      cancellationDateTimeUtc: '',
      lastUpdateDateTimeUtc: '2025-01-30T10:00:05Z',
      title: 'Run Script',
      ...overrides,
    });

    it('should validate successfully when script name and action ID match', () => {
      const actionDetails = createMockActionDetails();
      const result = checkActionMatches(actionDetails, 'hello.sh', 'kibana-action-123');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail validation when script name does not match', () => {
      const actionDetails = createMockActionDetails();
      const result = checkActionMatches(actionDetails, 'different-script.sh', 'kibana-action-123');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Cannot run script');
      expect(result.error).toContain('different-script.sh');
      expect(result.error).toContain('another script');
      expect(result.error).toContain('hello.sh');
      expect(result.error).toContain('already in progress');
    });

    it('should fail validation when action ID not in requestorComment', () => {
      const actionDetails = createMockActionDetails({
        requestorComment: 'Action triggered from Elastic Security (action id: different-action-id)',
      });
      const result = checkActionMatches(actionDetails, 'hello.sh', 'kibana-action-123');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Cannot run script');
      expect(result.error).toContain('hello.sh');
      expect(result.error).toContain('identical script is already in progress');
    });

    it('should fail validation when commands array is empty', () => {
      const actionDetails = createMockActionDetails({ commands: [] });
      const result = checkActionMatches(actionDetails, 'hello.sh', 'kibana-action-123');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unable to verify action details');
      expect(result.error).toContain('action information is incomplete');
    });

    it('should fail validation when ScriptName param is missing', () => {
      const actionDetails = createMockActionDetails({
        commands: [
          {
            index: 0,
            startTime: '2025-01-30T10:00:00Z',
            endTime: '2025-01-30T10:00:10Z',
            commandStatus: 'InProgress',
            errors: [],
            command: {
              type: 'RunScript',
              params: [{ key: 'Args', value: '--test' }],
            },
          },
        ],
      });
      const result = checkActionMatches(actionDetails, 'hello.sh', 'kibana-action-123');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unable to verify which script is running');
      expect(result.error).toContain('action information is incomplete');
    });

    it('should fail validation when requestorComment is empty', () => {
      const actionDetails = createMockActionDetails({ requestorComment: '' });
      const result = checkActionMatches(actionDetails, 'hello.sh', 'kibana-action-123');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Cannot run script');
      expect(result.error).toContain('identical script is already in progress');
    });

    it('should validate successfully with action ID anywhere in comment', () => {
      const actionDetails = createMockActionDetails({
        requestorComment: 'Some custom comment with kibana-action-123 embedded',
      });
      const result = checkActionMatches(actionDetails, 'hello.sh', 'kibana-action-123');

      expect(result.isValid).toBe(true);
    });

    it('should handle script names with special characters', () => {
      const actionDetails = createMockActionDetails({
        commands: [
          {
            index: 0,
            startTime: '2025-01-30T10:00:00Z',
            endTime: '2025-01-30T10:00:10Z',
            commandStatus: 'InProgress',
            errors: [],
            command: {
              type: 'RunScript',
              params: [{ key: 'ScriptName', value: 'script-name_v1.2.ps1' }],
            },
          },
        ],
      });
      const result = checkActionMatches(actionDetails, 'script-name_v1.2.ps1', 'kibana-action-123');

      expect(result.isValid).toBe(true);
    });

    it('should fail validation when expected script name is empty', () => {
      const actionDetails = createMockActionDetails();
      const result = checkActionMatches(actionDetails, '', 'kibana-action-123');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unable to validate action');
      expect(result.error).toContain('Missing required parameters');
    });

    it('should fail validation when expected action ID is empty', () => {
      const actionDetails = createMockActionDetails();
      const result = checkActionMatches(actionDetails, 'hello.sh', '');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unable to validate action');
      expect(result.error).toContain('Missing required parameters');
    });

    it('should fail validation when both expected script name and action ID are empty', () => {
      const actionDetails = createMockActionDetails();
      const result = checkActionMatches(actionDetails, '', '');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unable to validate action');
      expect(result.error).toContain('Missing required parameters');
    });
  });
});
