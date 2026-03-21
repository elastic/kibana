/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, KibanaRequest } from '@kbn/core/server';
import { matchAlertsToCases } from './case_matcher';
import { DEFAULT_PIPELINE_CONFIG } from '../types';

describe('Case Matching - Edge Cases and Error Scenarios', () => {
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  const mockRequest = {} as KibanaRequest;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle alerts with zero extracted entities', async () => {
    const mockCases = {
      getCasesClientWithRequest: jest.fn().mockResolvedValue({
        cases: {
          find: jest.fn().mockResolvedValue({
            cases: [{ id: 'case-1', observables: [{ typeKey: 'ipv4', value: '1.2.3.4' }] }],
            total: 1,
          }),
        },
      }),
    };

    const result = await matchAlertsToCases({
      entities: [], // No entities!
      cases: mockCases as any,
      config: DEFAULT_PIPELINE_CONFIG.caseMatching,
      logger: mockLogger,
      request: mockRequest,
    });

    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toHaveLength(0);
    expect(result.stats.alertsProcessed).toBe(0);
  });

  it('should handle cases with zero observables', async () => {
    const mockCases = {
      getCasesClientWithRequest: jest.fn().mockResolvedValue({
        cases: {
          find: jest.fn().mockResolvedValue({
            cases: [
              { id: 'case-1', observables: [] }, // No observables!
              { id: 'case-2', observables: [] },
            ],
            total: 2,
          }),
        },
      }),
    };

    const result = await matchAlertsToCases({
      entities: [{ typeKey: 'ipv4', value: '1.2.3.4', alertId: 'alert-1' }],
      cases: mockCases as any,
      config: DEFAULT_PIPELINE_CONFIG.caseMatching,
      logger: mockLogger,
      request: mockRequest,
    });

    // Should not match (no observables to compare)
    expect(result.unmatched).toHaveLength(1);
    expect(result.matched).toHaveLength(0);
  });

  it('should handle Cases API errors gracefully', async () => {
    const mockCases = {
      getCasesClientWithRequest: jest.fn().mockRejectedValue(new Error('Cases API unavailable')),
    };

    await expect(
      matchAlertsToCases({
        entities: [{ typeKey: 'ipv4', value: '1.2.3.4', alertId: 'alert-1' }],
        cases: mockCases as any,
        config: DEFAULT_PIPELINE_CONFIG.caseMatching,
        logger: mockLogger,
        request: mockRequest,
      })
    ).rejects.toThrow('Cases API unavailable');
  });

  it('should warn when case count exceeds pagination limit', async () => {
    const mockCases = {
      getCasesClientWithRequest: jest.fn().mockResolvedValue({
        cases: {
          find: jest.fn().mockResolvedValue({
            cases: Array.from({ length: 100 }, (_, i) => ({ id: `case-${i}`, observables: [] })),
            total: 500, // 500 total but only 100 returned!
          }),
        },
      }),
    };

    await matchAlertsToCases({
      entities: [{ typeKey: 'ipv4', value: '1.2.3.4', alertId: 'alert-1' }],
      cases: mockCases as any,
      config: DEFAULT_PIPELINE_CONFIG.caseMatching,
      logger: mockLogger,
      request: mockRequest,
    });

    // Should warn about pagination limit
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('limited to the 100 most recently updated')
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('out of 500 total'));
  });

  it('should handle temporal decay overflow (very old cases)', async () => {
    const veryOldDate = new Date('2020-01-01').toISOString();

    const mockCases = {
      getCasesClientWithRequest: jest.fn().mockResolvedValue({
        cases: {
          find: jest.fn().mockResolvedValue({
            cases: [
              {
                id: 'old-case',
                updated_at: veryOldDate, // 6+ years old
                observables: [{ typeKey: 'ipv4', value: '1.2.3.4' }],
              },
            ],
            total: 1,
          }),
        },
      }),
    };

    const result = await matchAlertsToCases({
      entities: [{ typeKey: 'ipv4', value: '1.2.3.4', alertId: 'alert-1' }],
      cases: mockCases as any,
      config: { ...DEFAULT_PIPELINE_CONFIG.caseMatching, strategy: 'temporal' as const },
      logger: mockLogger,
      request: mockRequest,
    });

    // Temporal decay should not produce negative scores
    if (result.matched.length > 0) {
      expect(result.matched[0].matchedCase?.score).toBeGreaterThanOrEqual(0);
      expect(result.matched[0].matchedCase?.score).toBeLessThanOrEqual(1);
    }
  });

  it('should handle case observable type key normalization failures', async () => {
    const mockCases = {
      getCasesClientWithRequest: jest.fn().mockResolvedValue({
        cases: {
          find: jest.fn().mockResolvedValue({
            cases: [
              {
                id: 'case-1',
                observables: [
                  { typeKey: 'unknown-type-xyz', value: '1.2.3.4' }, // Unknown type!
                ],
              },
            ],
            total: 1,
          }),
        },
      }),
    };

    const result = await matchAlertsToCases({
      entities: [{ typeKey: 'ipv4', value: '1.2.3.4', alertId: 'alert-1' }],
      cases: mockCases as any,
      config: DEFAULT_PIPELINE_CONFIG.caseMatching,
      logger: mockLogger,
      request: mockRequest,
    });

    // Should handle gracefully (normalized unknown type won't match)
    expect(result).toBeDefined();
    expect(result.stats.casesEvaluated).toBe(1);
  });

  it('should handle empty entity values', async () => {
    const mockCases = {
      getCasesClientWithRequest: jest.fn().mockResolvedValue({
        cases: {
          find: jest.fn().mockResolvedValue({
            cases: [
              {
                id: 'case-1',
                observables: [{ typeKey: 'user', value: '' }], // Empty value!
              },
            ],
            total: 1,
          }),
        },
      }),
    };

    const result = await matchAlertsToCases({
      entities: [{ typeKey: 'user', value: 'admin', alertId: 'alert-1' }],
      cases: mockCases as any,
      config: DEFAULT_PIPELINE_CONFIG.caseMatching,
      logger: mockLogger,
      request: mockRequest,
    });

    // Should not match empty values
    expect(result.unmatched).toHaveLength(1);
  });
});
