/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { logCrossSpaceCorrelation, validateSpaceIdFormat } from './validate_cross_space_access';

describe('validate_cross_space_access', () => {
  let logger: jest.Mocked<IRuleExecutionLogForExecutors>;

  beforeEach(() => {
    logger = {
      ...loggerMock.create(),
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setExecutionSucceeded: jest.fn(),
      setExecutionFailed: jest.fn(),
      setExecutionPartiallySucceeded: jest.fn(),
      logStatusChange: jest.fn(),
    } as unknown as jest.Mocked<IRuleExecutionLogForExecutors>;
  });

  describe('logCrossSpaceCorrelation', () => {
    it('should log when cross-space correlation is used', () => {
      logCrossSpaceCorrelation(['space-a', 'space-b'], 'default', logger);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Cross-space correlation executing')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('current_space="default"')
      );
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('target_spaces=[space-a, space-b]'));
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Elasticsearch document-level security will enforce access control')
      );
    });

    it('should not log when no target spaces specified', () => {
      logCrossSpaceCorrelation(undefined, 'default', logger);
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('should not log when target spaces is empty array', () => {
      logCrossSpaceCorrelation([], 'default', logger);
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('should not log when only correlating within current space', () => {
      logCrossSpaceCorrelation(['default'], 'default', logger);
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('should filter out current space from target spaces list', () => {
      logCrossSpaceCorrelation(['default', 'space-a', 'space-b'], 'default', logger);

      // Should log current space for context
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('current_space="default"'));
      // But target spaces should only include OTHER spaces (not current)
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('target_spaces=[space-a, space-b]')
      );
      // Verify 'default' doesn't appear in target_spaces list (only in current_space)
      const logCall = (logger.info as jest.Mock).mock.calls[0][0];
      const targetSpacesMatch = logCall.match(/target_spaces=\[(.*?)\]/);
      expect(targetSpacesMatch?.[1]).not.toContain('default');
    });

    it('should warn when correlating across many spaces', () => {
      const manySpaces = ['space-1', 'space-2', 'space-3', 'space-4', 'space-5', 'space-6'];
      logCrossSpaceCorrelation(manySpaces, 'default', logger);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('targets 6 spaces (possibly too broad)')
      );
    });

    it('should not warn for 5 or fewer spaces', () => {
      logCrossSpaceCorrelation(['space-1', 'space-2', 'space-3'], 'default', logger);
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('validateSpaceIdFormat', () => {
    it('should accept valid space IDs', () => {
      expect(() => validateSpaceIdFormat(['default'])).not.toThrow();
      expect(() => validateSpaceIdFormat(['space-a'])).not.toThrow();
      expect(() => validateSpaceIdFormat(['space_1'])).not.toThrow();
      expect(() => validateSpaceIdFormat(['test-space-123'])).not.toThrow();
      expect(() => validateSpaceIdFormat(['a', 'b', 'c'])).not.toThrow();
    });

    it('should reject space IDs with invalid characters', () => {
      expect(() => validateSpaceIdFormat(['Space-A'])).toThrow('Invalid space ID format');
      expect(() => validateSpaceIdFormat(['space.name'])).toThrow('Invalid space ID format');
      expect(() => validateSpaceIdFormat(['space/name'])).toThrow('Invalid space ID format');
      expect(() => validateSpaceIdFormat(['space name'])).toThrow('Invalid space ID format');
      expect(() => validateSpaceIdFormat(['space@name'])).toThrow('Invalid space ID format');
    });

    it('should reject ES|QL injection attempts', () => {
      expect(() => validateSpaceIdFormat(['space"; DROP TABLE'])).toThrow();
      expect(() => validateSpaceIdFormat(['../../../etc/passwd'])).toThrow();
      expect(() => validateSpaceIdFormat(['space\nname'])).toThrow();
    });

    it('should validate all spaces in array', () => {
      expect(() => validateSpaceIdFormat(['valid-space', 'Invalid-Space'])).toThrow(
        'Invalid space ID format: "Invalid-Space"'
      );
    });

    it('should accept empty array', () => {
      expect(() => validateSpaceIdFormat([])).not.toThrow();
    });
  });
});
