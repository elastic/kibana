/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { DiscoveryWithAlertIds } from '@kbn/discoveries/impl/attack_discovery/hallucination_detection';
import { filterHallucinatedAlerts } from '@kbn/discoveries/impl/attack_discovery/hallucination_detection';

import { filterAndValidateDiscoveries } from './filter_and_validate_discoveries';

jest.mock('@kbn/discoveries/impl/attack_discovery/hallucination_detection', () => ({
  filterHallucinatedAlerts: jest.fn(),
  getAlertIds: jest.requireActual('@kbn/discoveries/impl/attack_discovery/hallucination_detection')
    .getAlertIds,
}));

const mockFilterHallucinatedAlerts = filterHallucinatedAlerts as jest.MockedFunction<
  typeof filterHallucinatedAlerts
>;

describe('filterAndValidateDiscoveries', () => {
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  const mockContextLogger = {
    info: jest.fn(),
  };

  const mockEsClient = {} as unknown as ElasticsearchClient;

  const alertsIndexPattern = '.alerts-security.alerts-default';
  const generationUuid = 'test-generation-uuid';

  const mockDiscovery: DiscoveryWithAlertIds = {
    alertIds: ['alert-1', 'alert-2'],
    title: 'Test Discovery',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when attackDiscoveries is null', () => {
    it('returns shouldValidate: false and empty validDiscoveries', async () => {
      const result = await filterAndValidateDiscoveries({
        alertsIndexPattern,
        attackDiscoveries: null,
        contextLogger: mockContextLogger,
        esClient: mockEsClient,
        generationUuid,
        logger: mockLogger,
      });

      expect(result).toEqual({
        filteredCount: 0,
        filterReason: 'no_discoveries',
        shouldValidate: false,
        validDiscoveries: [],
      });
    });

    it('logs a warning about no discoveries to validate', async () => {
      await filterAndValidateDiscoveries({
        alertsIndexPattern,
        attackDiscoveries: null,
        contextLogger: mockContextLogger,
        esClient: mockEsClient,
        generationUuid,
        logger: mockLogger,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No attack discoveries to validate')
      );
    });

    it('logs to the context logger about no discoveries', async () => {
      await filterAndValidateDiscoveries({
        alertsIndexPattern,
        attackDiscoveries: null,
        contextLogger: mockContextLogger,
        esClient: mockEsClient,
        generationUuid,
        logger: mockLogger,
      });

      expect(mockContextLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('No attack discoveries to validate')
      );
    });
  });

  describe('when attackDiscoveries is undefined', () => {
    it('returns shouldValidate: false with no_discoveries filter reason', async () => {
      const result = await filterAndValidateDiscoveries({
        alertsIndexPattern,
        attackDiscoveries: undefined,
        contextLogger: mockContextLogger,
        esClient: mockEsClient,
        generationUuid,
        logger: mockLogger,
      });

      expect(result).toEqual({
        filteredCount: 0,
        filterReason: 'no_discoveries',
        shouldValidate: false,
        validDiscoveries: [],
      });
    });
  });

  describe('when attackDiscoveries is an empty array', () => {
    it('returns shouldValidate: false with no_discoveries filter reason', async () => {
      const result = await filterAndValidateDiscoveries({
        alertsIndexPattern,
        attackDiscoveries: [],
        contextLogger: mockContextLogger,
        esClient: mockEsClient,
        generationUuid,
        logger: mockLogger,
      });

      expect(result).toEqual({
        filteredCount: 0,
        filterReason: 'no_discoveries',
        shouldValidate: false,
        validDiscoveries: [],
      });
    });
  });

  describe('when all discoveries are filtered out due to hallucinated alert IDs', () => {
    beforeEach(() => {
      mockFilterHallucinatedAlerts.mockResolvedValue([]);
    });

    it('returns shouldValidate: false with hallucinated_alert_ids filter reason', async () => {
      const result = await filterAndValidateDiscoveries({
        alertsIndexPattern,
        attackDiscoveries: [mockDiscovery],
        contextLogger: mockContextLogger,
        esClient: mockEsClient,
        generationUuid,
        logger: mockLogger,
      });

      expect(result).toEqual({
        filteredCount: 1,
        filterReason: 'hallucinated_alert_ids',
        shouldValidate: false,
        validDiscoveries: [],
      });
    });

    it('logs a warning about hallucinated alert IDs', async () => {
      await filterAndValidateDiscoveries({
        alertsIndexPattern,
        attackDiscoveries: [mockDiscovery],
        contextLogger: mockContextLogger,
        esClient: mockEsClient,
        generationUuid,
        logger: mockLogger,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'All attack discoveries were filtered out due to hallucinated alert IDs'
        )
      );
    });

    it('logs sample filtered alert IDs for debugging', async () => {
      await filterAndValidateDiscoveries({
        alertsIndexPattern,
        attackDiscoveries: [mockDiscovery],
        contextLogger: mockContextLogger,
        esClient: mockEsClient,
        generationUuid,
        logger: mockLogger,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Sample filtered alert IDs')
      );
    });

    it('logs to the context logger for event log tracking', async () => {
      await filterAndValidateDiscoveries({
        alertsIndexPattern,
        attackDiscoveries: [mockDiscovery],
        contextLogger: mockContextLogger,
        esClient: mockEsClient,
        generationUuid,
        logger: mockLogger,
      });

      expect(mockContextLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('All attack discoveries were filtered out')
      );
    });
  });

  describe('when some discoveries remain after filtering', () => {
    beforeEach(() => {
      mockFilterHallucinatedAlerts.mockResolvedValue([mockDiscovery]);
    });

    it('returns shouldValidate: true with zero filteredCount when none were filtered', async () => {
      const result = await filterAndValidateDiscoveries({
        alertsIndexPattern,
        attackDiscoveries: [mockDiscovery],
        contextLogger: mockContextLogger,
        esClient: mockEsClient,
        generationUuid,
        logger: mockLogger,
      });

      expect(result).toEqual({
        filteredCount: 0,
        shouldValidate: true,
        validDiscoveries: [mockDiscovery],
      });
    });

    it('does not include filterReason when no discoveries were filtered', async () => {
      const result = await filterAndValidateDiscoveries({
        alertsIndexPattern,
        attackDiscoveries: [mockDiscovery],
        contextLogger: mockContextLogger,
        esClient: mockEsClient,
        generationUuid,
        logger: mockLogger,
      });

      expect(result.filterReason).toBeUndefined();
    });

    it('logs the filter results at info level', async () => {
      await filterAndValidateDiscoveries({
        alertsIndexPattern,
        attackDiscoveries: [mockDiscovery],
        contextLogger: mockContextLogger,
        esClient: mockEsClient,
        generationUuid,
        logger: mockLogger,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          'After hallucination filter: 1/1 discoveries remain (1 verified + 0 unverifiable)'
        )
      );
    });
  });

  describe('when some discoveries are filtered by hallucination detection', () => {
    const discovery1: DiscoveryWithAlertIds = {
      alertIds: ['alert-1'],
      title: 'Discovery 1',
    };

    const discovery2: DiscoveryWithAlertIds = {
      alertIds: ['alert-2'],
      title: 'Discovery 2',
    };

    beforeEach(() => {
      mockFilterHallucinatedAlerts.mockResolvedValue([discovery1]);
    });

    it('returns filteredCount matching the number of removed discoveries', async () => {
      const result = await filterAndValidateDiscoveries({
        alertsIndexPattern,
        attackDiscoveries: [discovery1, discovery2],
        contextLogger: mockContextLogger,
        esClient: mockEsClient,
        generationUuid,
        logger: mockLogger,
      });

      expect(result.filteredCount).toBe(1);
    });

    it('returns hallucinated_alert_ids as the filterReason', async () => {
      const result = await filterAndValidateDiscoveries({
        alertsIndexPattern,
        attackDiscoveries: [discovery1, discovery2],
        contextLogger: mockContextLogger,
        esClient: mockEsClient,
        generationUuid,
        logger: mockLogger,
      });

      expect(result.filterReason).toBe('hallucinated_alert_ids');
    });
  });

  describe('when discoveries use snake_case alert_ids', () => {
    const snakeCaseDiscovery = {
      alert_ids: ['alert-1', 'alert-2'],
      details_markdown: 'Test details',
      entity_summary_markdown: 'Test entity summary',
      mitre_attack_tactics: ['Initial Access'],
      summary_markdown: 'Test summary',
      title: 'Test Discovery',
    } as unknown as DiscoveryWithAlertIds;

    beforeEach(() => {
      mockFilterHallucinatedAlerts.mockResolvedValue([]);
    });

    it('logs sample filtered alert IDs from snake_case properties', async () => {
      await filterAndValidateDiscoveries({
        alertsIndexPattern,
        attackDiscoveries: [snakeCaseDiscovery],
        contextLogger: mockContextLogger,
        esClient: mockEsClient,
        generationUuid,
        logger: mockLogger,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('["alert-1","alert-2"]')
      );
    });
  });

  describe('when discoveries are a mix of verifiable and unverifiable', () => {
    const verifiableDiscovery: DiscoveryWithAlertIds = {
      alertIds: ['alert-1', 'alert-2'],
      title: 'Verifiable Discovery',
    };

    const unverifiableDiscovery: DiscoveryWithAlertIds = {
      alertIds: [],
      title: 'Unverifiable Discovery (empty alertIds)',
    };

    const unverifiableDiscoveryNoField: DiscoveryWithAlertIds = {
      title: 'Unverifiable Discovery (no alertIds field)',
    };

    describe('when verifiable discoveries pass hallucination detection', () => {
      beforeEach(() => {
        mockFilterHallucinatedAlerts.mockResolvedValue([verifiableDiscovery]);
      });

      it('includes both verified and unverifiable discoveries in the result', async () => {
        const result = await filterAndValidateDiscoveries({
          alertsIndexPattern,
          attackDiscoveries: [verifiableDiscovery, unverifiableDiscovery],
          contextLogger: mockContextLogger,
          esClient: mockEsClient,
          generationUuid,
          logger: mockLogger,
        });

        expect(result.validDiscoveries).toEqual(
          expect.arrayContaining([verifiableDiscovery, unverifiableDiscovery])
        );
        expect(result.validDiscoveries).toHaveLength(2);
      });

      it('returns shouldValidate: true', async () => {
        const result = await filterAndValidateDiscoveries({
          alertsIndexPattern,
          attackDiscoveries: [verifiableDiscovery, unverifiableDiscovery],
          contextLogger: mockContextLogger,
          esClient: mockEsClient,
          generationUuid,
          logger: mockLogger,
        });

        expect(result.shouldValidate).toBe(true);
      });

      it('passes only verifiable discoveries to filterHallucinatedAlerts', async () => {
        await filterAndValidateDiscoveries({
          alertsIndexPattern,
          attackDiscoveries: [verifiableDiscovery, unverifiableDiscovery],
          contextLogger: mockContextLogger,
          esClient: mockEsClient,
          generationUuid,
          logger: mockLogger,
        });

        expect(mockFilterHallucinatedAlerts).toHaveBeenCalledWith(
          expect.objectContaining({
            attackDiscoveries: [verifiableDiscovery],
          })
        );
      });

      it('includes unverifiable discoveries that have no alertIds field', async () => {
        const result = await filterAndValidateDiscoveries({
          alertsIndexPattern,
          attackDiscoveries: [verifiableDiscovery, unverifiableDiscoveryNoField],
          contextLogger: mockContextLogger,
          esClient: mockEsClient,
          generationUuid,
          logger: mockLogger,
        });

        expect(result.validDiscoveries).toEqual(
          expect.arrayContaining([verifiableDiscovery, unverifiableDiscoveryNoField])
        );
        expect(result.validDiscoveries).toHaveLength(2);
      });
    });

    describe('when all verifiable discoveries are filtered out by hallucination detection', () => {
      beforeEach(() => {
        mockFilterHallucinatedAlerts.mockResolvedValue([]);
      });

      it('still includes unverifiable discoveries', async () => {
        const result = await filterAndValidateDiscoveries({
          alertsIndexPattern,
          attackDiscoveries: [verifiableDiscovery, unverifiableDiscovery],
          contextLogger: mockContextLogger,
          esClient: mockEsClient,
          generationUuid,
          logger: mockLogger,
        });

        expect(result.validDiscoveries).toEqual([unverifiableDiscovery]);
      });

      it('returns shouldValidate: true when unverifiable discoveries remain', async () => {
        const result = await filterAndValidateDiscoveries({
          alertsIndexPattern,
          attackDiscoveries: [verifiableDiscovery, unverifiableDiscovery],
          contextLogger: mockContextLogger,
          esClient: mockEsClient,
          generationUuid,
          logger: mockLogger,
        });

        expect(result.shouldValidate).toBe(true);
      });

      it('returns filteredCount of 1 and hallucinated_alert_ids reason', async () => {
        const result = await filterAndValidateDiscoveries({
          alertsIndexPattern,
          attackDiscoveries: [verifiableDiscovery, unverifiableDiscovery],
          contextLogger: mockContextLogger,
          esClient: mockEsClient,
          generationUuid,
          logger: mockLogger,
        });

        expect(result.filteredCount).toBe(1);
        expect(result.filterReason).toBe('hallucinated_alert_ids');
      });
    });

    describe('when multiple unverifiable discoveries are mixed in', () => {
      const anotherUnverifiable: DiscoveryWithAlertIds = {
        alertIds: [],
        title: 'Another Unverifiable Discovery',
      };

      beforeEach(() => {
        mockFilterHallucinatedAlerts.mockResolvedValue([verifiableDiscovery]);
      });

      it('includes all unverifiable discoveries alongside verified ones', async () => {
        const result = await filterAndValidateDiscoveries({
          alertsIndexPattern,
          attackDiscoveries: [verifiableDiscovery, unverifiableDiscovery, anotherUnverifiable],
          contextLogger: mockContextLogger,
          esClient: mockEsClient,
          generationUuid,
          logger: mockLogger,
        });

        expect(result.validDiscoveries).toEqual(
          expect.arrayContaining([verifiableDiscovery, unverifiableDiscovery, anotherUnverifiable])
        );
        expect(result.validDiscoveries).toHaveLength(3);
      });
    });
  });

  describe('when all discoveries have empty alert IDs', () => {
    const emptyAlertIdsDiscovery: DiscoveryWithAlertIds = {
      alertIds: [],
      title: 'No alert IDs',
    };

    it('returns filteredCount of 0 and no filterReason', async () => {
      const result = await filterAndValidateDiscoveries({
        alertsIndexPattern,
        attackDiscoveries: [emptyAlertIdsDiscovery],
        contextLogger: mockContextLogger,
        esClient: mockEsClient,
        generationUuid,
        logger: mockLogger,
      });

      expect(result.filteredCount).toBe(0);
      expect(result.filterReason).toBeUndefined();
      expect(result.shouldValidate).toBe(true);
    });
  });
});
