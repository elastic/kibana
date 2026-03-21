/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { enrichAlertsWithEntityRisk } from './entity_risk_enrichment';
import type { AlertWithId } from '../utils';

describe('Entity Risk Enrichment - Error Scenarios', () => {
  const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  const createAlert = (id: string, source: Record<string, unknown>): AlertWithId => ({
    _id: id,
    _source: source,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should gracefully handle Entity Store client unavailable', async () => {
    const alerts = [
      createAlert('alert-1', {
        host: { name: 'server-1' },
        kibana: { alert: { risk_score: 75 } },
      }),
    ];

    const result = await enrichAlertsWithEntityRisk({
      alerts,
      entityStoreClient: null, // Not available
      logger: mockLogger,
    });

    // Should use static risk scores
    expect(result).toHaveLength(1);
    expect(result[0].adjustedRiskScore).toBe(75); // Static risk
    expect(result[0].entityRiskScores).toEqual([]);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Entity Store not available - using static risk scores'
    );
  });

  it('should handle Entity Store query failures gracefully', async () => {
    const alerts = [
      createAlert('alert-1', {
        host: { name: 'server-1' },
        user: { name: 'admin' },
        kibana: { alert: { risk_score: 75 } },
      }),
    ];

    const mockEntityStore = {
      searchEntities: jest.fn().mockRejectedValue(new Error('Entity Store timeout')),
    };

    const result = await enrichAlertsWithEntityRisk({
      alerts,
      entityStoreClient: mockEntityStore as any,
      logger: mockLogger,
    });

    // Should fallback to static risk
    expect(result).toHaveLength(1);
    expect(result[0].adjustedRiskScore).toBe(75 * 0.5); // Static × neutral (50)
    expect(result[0].entityRiskScores).toEqual([]);

    // Should log failures
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Failed to query host risk')
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Failed to query user risk')
    );
  });

  it('should handle entities not found in Entity Store', async () => {
    const alerts = [
      createAlert('alert-1', {
        host: { name: 'unknown-host' },
        kibana: { alert: { risk_score: 75 } },
      }),
    ];

    const mockEntityStore = {
      searchEntities: jest.fn().mockResolvedValue({
        records: [], // No entities found
      }),
    };

    const result = await enrichAlertsWithEntityRisk({
      alerts,
      entityStoreClient: mockEntityStore as any,
      logger: mockLogger,
    });

    // Should use neutral risk (50) when entity not found
    expect(result[0].adjustedRiskScore).toBe(75 * 0.5); // 75 × (50/100) = 37.5
    expect(result[0].entityRiskScores).toEqual([]);
  });

  it('should handle alerts with no host or user fields', async () => {
    const alerts = [
      createAlert('alert-1', {
        // No host or user
        process: { name: 'cmd.exe' },
        kibana: { alert: { risk_score: 60 } },
      }),
    ];

    const mockEntityStore = {
      searchEntities: jest.fn(), // Should not be called
    };

    const result = await enrichAlertsWithEntityRisk({
      alerts,
      entityStoreClient: mockEntityStore as any,
      logger: mockLogger,
    });

    // Should use neutral risk
    expect(result[0].adjustedRiskScore).toBe(60 * 0.5);
    expect(result[0].entityRiskScores).toEqual([]);
    expect(mockEntityStore.searchEntities).not.toHaveBeenCalled();
  });

  it('should use max entity risk when multiple entities found', async () => {
    const alerts = [
      createAlert('alert-1', {
        host: { name: 'critical-server' },
        user: { name: 'low-risk-user' },
        kibana: { alert: { risk_score: 80 } },
      }),
    ];

    const mockEntityStore = {
      searchEntities: jest
        .fn()
        .mockResolvedValueOnce({
          // Host query
          records: [{ asset: { criticality: 'extreme_impact' } }], // Risk: 100
        })
        .mockResolvedValueOnce({
          // User query
          records: [{ asset: { criticality: 'low_impact' } }], // Risk: 25
        }),
    };

    const result = await enrichAlertsWithEntityRisk({
      alerts,
      entityStoreClient: mockEntityStore as any,
      logger: mockLogger,
    });

    // Should use MAX(host=100, user=25) = 100
    expect(result[0].adjustedRiskScore).toBe(80 * 1.0); // 80 × (100/100) = 80
    expect(result[0].entityRiskScores).toHaveLength(2);
    expect(result[0].entityRiskScores[0].riskScore).toBe(100);
    expect(result[0].entityRiskScores[1].riskScore).toBe(25);
  });

  it('should handle missing risk_score field in alert', async () => {
    const alerts = [
      createAlert('alert-1', {
        host: { name: 'server-1' },
        // No kibana.alert.risk_score
      }),
    ];

    const result = await enrichAlertsWithEntityRisk({
      alerts,
      entityStoreClient: null,
      logger: mockLogger,
    });

    // Should default to 50 when risk_score missing
    expect(result[0].adjustedRiskScore).toBe(50);
  });
});
