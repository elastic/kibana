/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MicrosoftDefenderEndpointMachineAction } from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/types';
import { checkActionMatches, retryWithDelay } from './utils';

describe('MDE validation utilities', () => {
  describe('retryWithDelay', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return result on first attempt if successful', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const promise = retryWithDelay(mockFn);
      jest.runAllTimers();
      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry once after delay if first attempt returns undefined', async () => {
      const mockFn = jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce('success on retry');

      const promise = retryWithDelay(mockFn, 300, 1);

      // First call happens immediately
      await Promise.resolve();
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Fast-forward time for retry delay
      jest.advanceTimersByTime(300);

      const result = await promise;
      expect(result).toBe('success on retry');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should return undefined if all retries fail', async () => {
      const mockFn = jest.fn().mockResolvedValue(undefined);

      const promise = retryWithDelay(mockFn, 100, 2);

      // Run all timers and flush promises
      await jest.runAllTimersAsync();

      const result = await promise;
      expect(result).toBeUndefined();
      expect(mockFn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should use configurable delay', async () => {
      const mockFn = jest.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce('success');

      const customDelay = 500;
      const promise = retryWithDelay(mockFn, customDelay, 1);

      // Run all timers and flush promises
      await jest.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should use configurable maxRetries', async () => {
      const mockFn = jest.fn().mockResolvedValue(undefined);

      const promise = retryWithDelay(mockFn, 100, 5);

      // Run all timers and flush promises
      await jest.runAllTimersAsync();
      await promise;

      expect(mockFn).toHaveBeenCalledTimes(6); // initial + 5 retries
    });

    it('should stop retrying once result is found', async () => {
      const mockFn = jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce('success')
        .mockResolvedValueOnce('should not be called');

      const promise = retryWithDelay(mockFn, 100, 5);

      // Run all timers and flush promises
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3); // stops after success
    });
  });

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
      expect(result.error).toContain('script name mismatched');
      expect(result.error).toContain("Expected 'different-script.sh'");
      expect(result.error).toContain("found 'hello.sh'");
    });

    it('should fail validation when action ID not in requestorComment', () => {
      const actionDetails = createMockActionDetails({
        requestorComment: 'Action triggered from Elastic Security (action id: different-action-id)',
      });
      const result = checkActionMatches(actionDetails, 'hello.sh', 'kibana-action-123');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain(
        'Microsoft Defender returned an existing action that was not created by this request'
      );
      expect(result.error).toContain(
        "Expected action ID 'kibana-action-123' not found in requestor comment"
      );
    });

    it('should fail validation when commands array is empty', () => {
      const actionDetails = createMockActionDetails({ commands: [] });
      const result = checkActionMatches(actionDetails, 'hello.sh', 'kibana-action-123');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('has no command information');
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
      expect(result.error).toContain(
        'Unable to extract script name from Microsoft Defender action'
      );
    });

    it('should fail validation when requestorComment is empty', () => {
      const actionDetails = createMockActionDetails({ requestorComment: '' });
      const result = checkActionMatches(actionDetails, 'hello.sh', 'kibana-action-123');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Microsoft Defender returned an existing action');
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
      expect(result.error).toContain('Invalid validation parameters');
      expect(result.error).toContain('script name and action ID are required');
    });

    it('should fail validation when expected action ID is empty', () => {
      const actionDetails = createMockActionDetails();
      const result = checkActionMatches(actionDetails, 'hello.sh', '');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid validation parameters');
      expect(result.error).toContain('script name and action ID are required');
    });

    it('should fail validation when both expected script name and action ID are empty', () => {
      const actionDetails = createMockActionDetails();
      const result = checkActionMatches(actionDetails, '', '');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid validation parameters');
      expect(result.error).toContain('script name and action ID are required');
    });
  });
});
