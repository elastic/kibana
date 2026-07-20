/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import { deduplicateScheduledDiscoveries } from '.';

const mockDeduplicateAttackDiscoveries = jest.fn();
const mockGetScheduledIndexPattern = jest.fn();
const mockNormalizeAttackDiscovery = jest.fn();

jest.mock('@kbn/attack-discovery-schedules-common', () => ({
  deduplicateAttackDiscoveries: (...args: unknown[]) => mockDeduplicateAttackDiscoveries(...args),
  getScheduledIndexPattern: (...args: unknown[]) => mockGetScheduledIndexPattern(...args),
  normalizeAttackDiscovery: (...args: unknown[]) => mockNormalizeAttackDiscovery(...args),
}));

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const mockEsClient = {} as unknown as ElasticsearchClient;

const rawDiscoveries = [
  { alert_ids: ['a1'], title: 'Discovery 1' },
  { alert_ids: ['a2'], title: 'Discovery 2' },
];

const computeSha256Hash = (input: string): string => `sha256(${input})`;

const baseParams = {
  computeSha256Hash,
  connectorId: 'test-connector-id',
  discoveriesToPersist: rawDiscoveries,
  esClient: mockEsClient,
  logger: mockLogger,
  replacements: { 'user-1': 'REDACTED_USER_1' },
  ruleId: 'rule-123',
  spaceId: 'default',
};

describe('deduplicateScheduledDiscoveries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetScheduledIndexPattern.mockReturnValue(
      '.alerts-security.attack.discovery.alerts-default'
    );
    // Echo back a normalized marker so the test can assert normalization was applied.
    mockNormalizeAttackDiscovery.mockImplementation((raw: { title: string }) => ({
      normalized: true,
      title: raw.title,
    }));
    // Default: drop the second discovery (simulate one cross-execution duplicate).
    mockDeduplicateAttackDiscoveries.mockResolvedValue([
      { normalized: true, title: 'Discovery 1' },
    ]);
  });

  it('returns the deduplicated discoveries from the shared helper', async () => {
    const result = await deduplicateScheduledDiscoveries(baseParams);

    expect(result).toEqual([{ normalized: true, title: 'Discovery 1' }]);
  });

  it('normalizes each raw discovery before de-duplicating', async () => {
    await deduplicateScheduledDiscoveries(baseParams);

    expect(mockNormalizeAttackDiscovery).toHaveBeenCalledTimes(2);
    expect(mockNormalizeAttackDiscovery).toHaveBeenNthCalledWith(1, rawDiscoveries[0]);
    expect(mockNormalizeAttackDiscovery).toHaveBeenNthCalledWith(2, rawDiscoveries[1]);
  });

  it('passes the normalized discoveries to the shared dedup helper', async () => {
    await deduplicateScheduledDiscoveries(baseParams);

    expect(mockDeduplicateAttackDiscoveries).toHaveBeenCalledWith(
      expect.objectContaining({
        attackDiscoveries: [
          { normalized: true, title: 'Discovery 1' },
          { normalized: true, title: 'Discovery 2' },
        ],
      })
    );
  });

  it('passes the scheduled index pattern for the space', async () => {
    await deduplicateScheduledDiscoveries(baseParams);

    expect(mockGetScheduledIndexPattern).toHaveBeenCalledWith('default');
    expect(mockDeduplicateAttackDiscoveries).toHaveBeenCalledWith(
      expect.objectContaining({
        indexPattern: '.alerts-security.attack.discovery.alerts-default',
      })
    );
  });

  it('passes ownerInfo with the in-process ruleId and isSchedule true', async () => {
    await deduplicateScheduledDiscoveries(baseParams);

    expect(mockDeduplicateAttackDiscoveries).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerInfo: { id: 'rule-123', isSchedule: true },
      })
    );
  });

  it('passes the connectorId and replacements', async () => {
    await deduplicateScheduledDiscoveries(baseParams);

    expect(mockDeduplicateAttackDiscoveries).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorId: 'test-connector-id',
        esClient: mockEsClient,
        replacements: { 'user-1': 'REDACTED_USER_1' },
        spaceId: 'default',
      })
    );
  });

  it('forwards the injected computeSha256Hash to the shared dedup helper', async () => {
    await deduplicateScheduledDiscoveries(baseParams);

    expect(mockDeduplicateAttackDiscoveries).toHaveBeenCalledWith(
      expect.objectContaining({ computeSha256Hash })
    );
  });

  it('returns the input unchanged without calling the shared helper when there are no discoveries', async () => {
    const result = await deduplicateScheduledDiscoveries({
      ...baseParams,
      discoveriesToPersist: [],
    });

    expect(result).toEqual([]);
    expect(mockDeduplicateAttackDiscoveries).not.toHaveBeenCalled();
  });

  describe('when the shared dedup helper throws (best-effort)', () => {
    beforeEach(() => {
      mockDeduplicateAttackDiscoveries.mockRejectedValue(new Error('es boom'));
    });

    it('falls back to the original discoveries (no dedup)', async () => {
      const result = await deduplicateScheduledDiscoveries(baseParams);

      expect(result).toBe(rawDiscoveries);
    });

    it('logs the error', async () => {
      await deduplicateScheduledDiscoveries(baseParams);

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('es boom'));
    });
  });
});
