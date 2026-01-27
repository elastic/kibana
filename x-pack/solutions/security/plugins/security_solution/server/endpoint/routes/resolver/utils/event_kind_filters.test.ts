/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEventKindFilter } from './event_kind_filters';
import * as securityModules from '../entity/utils/security_modules';

jest.mock('../entity/utils/security_modules');

/**
 * Type interface for the expected structure of the event kind filter result
 * This helps with type assertions in tests
 */
interface EventKindFilterResult {
  bool: {
    should: Array<{
      term?: { 'event.kind': string } | { [key: string]: string };
      bool?: {
        must: Array<{
          term?: { 'event.kind': string };
          terms?: { 'event.module': string[] };
        }>;
      };
    }>;
    minimum_should_match: number;
  };
}

/**
 * Test helper function to create and properly cast the event kind filter result
 * This centralizes the type casting to avoid repetition and type errors
 */
const createEventKindFilterForTest = (): EventKindFilterResult => {
  return createEventKindFilter() as unknown as EventKindFilterResult;
};

const mockGetAllSecurityModules = securityModules.getAllSecurityModules as jest.MockedFunction<
  typeof securityModules.getAllSecurityModules
>;

describe('event_kind_filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEventKindFilter', () => {
    describe('query structure snapshots', () => {
      it('should generate expected query structure with multiple modules', () => {
        mockGetAllSecurityModules.mockReturnValue(['crowdstrike', 'sentinel_one']);
        const result = createEventKindFilterForTest();
        expect(result).toMatchSnapshot();
      });

      it('should handle empty modules list', () => {
        mockGetAllSecurityModules.mockReturnValue([]);
        const result = createEventKindFilterForTest();
        expect(result).toMatchSnapshot();
      });

      it('should handle single module', () => {
        mockGetAllSecurityModules.mockReturnValue(['crowdstrike']);
        const result = createEventKindFilterForTest();
        expect(result).toMatchSnapshot();
      });
    });

    it('should call getAllSecurityModules to get current module list', () => {
      mockGetAllSecurityModules.mockReturnValue(['test_module']);

      createEventKindFilter();

      expect(mockGetAllSecurityModules).toHaveBeenCalledTimes(1);
      expect(mockGetAllSecurityModules).toHaveBeenCalledWith();
    });

    describe('integration with security modules', () => {
      it('should use the latest security modules configuration', () => {
        // First call returns some modules
        mockGetAllSecurityModules.mockReturnValueOnce(['crowdstrike']);
        const result1 = createEventKindFilterForTest();

        // Second call returns different modules (simulating feature flag changes)
        mockGetAllSecurityModules.mockReturnValueOnce([
          'crowdstrike',
          'microsoft_defender_endpoint',
        ]);
        const result2 = createEventKindFilterForTest();

        expect(result1.bool.should[1].bool!.must[1]).toEqual({
          terms: { 'event.module': ['crowdstrike'] },
        });

        expect(result2.bool.should[1].bool!.must[1]).toEqual({
          terms: { 'event.module': ['crowdstrike', 'microsoft_defender_endpoint'] },
        });
      });

      it('should handle dynamic security module changes', () => {
        // Simulate a scenario where modules change between calls
        const moduleConfigurations = [
          ['crowdstrike'],
          ['crowdstrike', 'sentinel_one'],
          ['crowdstrike', 'sentinel_one', 'microsoft_defender_endpoint'],
        ];

        moduleConfigurations.forEach((modules, index) => {
          mockGetAllSecurityModules.mockReturnValueOnce(modules);
          const result = createEventKindFilterForTest();

          expect(result.bool.should[1].bool!.must[1]).toEqual({
            terms: { 'event.module': modules },
          });
          expect(mockGetAllSecurityModules).toHaveBeenCalledTimes(index + 1);
        });
      });
    });

    describe('return value consistency', () => {
      it('should return a new object each time (not cached)', () => {
        mockGetAllSecurityModules.mockReturnValue(['crowdstrike']);

        const result1 = createEventKindFilterForTest();
        const result2 = createEventKindFilterForTest();

        expect(result1).not.toBe(result2);
        expect(result1).toEqual(result2);
        expect(mockGetAllSecurityModules).toHaveBeenCalledTimes(2);
      });

      it('should be safe to mutate the returned object', () => {
        mockGetAllSecurityModules.mockReturnValue(['crowdstrike']);

        const result = createEventKindFilterForTest();

        // Mutating the result should not affect future calls
        result.bool.should.push({ term: { 'test.field': 'test' } });

        const result2 = createEventKindFilterForTest();
        expect(result2.bool.should).toHaveLength(2);
      });
    });

    describe('error handling', () => {
      it('should handle getAllSecurityModules throwing an error', () => {
        mockGetAllSecurityModules.mockImplementation(() => {
          throw new Error('Security modules error');
        });

        expect(() => createEventKindFilter()).toThrow('Security modules error');
      });
    });
  });
});
