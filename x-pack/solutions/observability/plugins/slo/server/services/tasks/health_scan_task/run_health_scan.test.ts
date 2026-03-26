/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { HEALTH_DATA_STREAM_NAME } from '../../../../common/constants';
import type { StoredSLODefinition } from '../../../domain/models';
import type { SLOHealth } from '../../../domain/services/compute_health';
import { computeHealth } from '../../../domain/services/compute_health';
import { SO_SLO_TYPE } from '../../../saved_objects';
import { runHealthScan } from './run_health_scan';

jest.mock('../../../domain/services/compute_health');
const computeHealthMock = computeHealth as jest.MockedFunction<typeof computeHealth>;

describe('runHealthScan', () => {
  let scopedClusterClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;
  let abortController: AbortController;

  const TEST_SCAN_ID = 'test-scan-id';
  const TEST_DATE = new Date('2024-01-01T00:00:00.000Z');

  beforeEach(() => {
    scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    soClient = savedObjectsClientMock.create();
    logger = loggerMock.create();
    abortController = new AbortController();
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(TEST_DATE);
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: () => void) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function createMockStoredSLO(
    id: string,
    namespaces: string[] = ['default']
  ): SavedObjectsFindResult<StoredSLODefinition> {
    return {
      id: `so-${id}`,
      type: SO_SLO_TYPE,
      references: [],
      score: 1,
      namespaces,
      attributes: {
        id,
        revision: 1,
        name: `SLO ${id}`,
        enabled: true,
      } as StoredSLODefinition,
    };
  }

  function createMockHealthResult(id: string, isProblematic: boolean): SLOHealth {
    return {
      id,
      instanceId: '*',
      revision: 1,
      name: `SLO ${id}`,
      health: {
        isProblematic,
        rollup: {
          isProblematic,
          missing: false,
          status: isProblematic ? 'unhealthy' : 'healthy',
          state: 'started',
        },
        summary: {
          isProblematic: false,
          missing: false,
          status: 'healthy',
          state: 'started',
        },
      },
    };
  }

  function mockPointInTimeFinder(pages: Array<Array<SavedObjectsFindResult<StoredSLODefinition>>>) {
    const closeMock = jest.fn();
    soClient.createPointInTimeFinder.mockReturnValue({
      close: closeMock,
      async *find() {
        for (const page of pages) {
          yield { saved_objects: page };
        }
      },
    } as any);
    return { closeMock };
  }

  describe('empty SLO list', () => {
    it('should return zero processed and problematic when no SLOs exist', async () => {
      const { closeMock } = mockPointInTimeFinder([[]]);

      const result = await runHealthScan(
        { scanId: TEST_SCAN_ID },
        { scopedClusterClient, soClient: soClient as any, logger, abortController }
      );

      expect(result).toEqual({ processed: 0, problematic: 0 });
      expect(computeHealthMock).not.toHaveBeenCalled();
      expect(scopedClusterClient.asInternalUser.bulk).not.toHaveBeenCalled();
      expect(closeMock).toHaveBeenCalled();
    });
  });

  describe('single page processing', () => {
    it('should process SLOs and bulk insert health documents', async () => {
      const slo1 = createMockStoredSLO('slo-1');
      const slo2 = createMockStoredSLO('slo-2');
      const { closeMock } = mockPointInTimeFinder([[slo1, slo2]]);

      computeHealthMock.mockResolvedValueOnce([
        createMockHealthResult('slo-1', false),
        createMockHealthResult('slo-2', true),
      ]);

      const result = await runHealthScan(
        { scanId: TEST_SCAN_ID },
        { scopedClusterClient, soClient: soClient as any, logger, abortController }
      );

      expect(result).toEqual({ processed: 2, problematic: 1 });
      expect(computeHealthMock).toHaveBeenCalledTimes(1);
      expect(computeHealthMock).toHaveBeenCalledWith(
        [
          { id: 'slo-1', revision: 1, name: 'SLO slo-1', enabled: true, spaceId: 'default' },
          { id: 'slo-2', revision: 1, name: 'SLO slo-2', enabled: true, spaceId: 'default' },
        ],
        { scopedClusterClient }
      );
      expect(scopedClusterClient.asInternalUser.bulk).toHaveBeenCalledTimes(1);
      expect(closeMock).toHaveBeenCalled();
    });

    it('should create health documents with correct structure', async () => {
      const slo = createMockStoredSLO('slo-1', ['custom-space']);
      const { closeMock } = mockPointInTimeFinder([[slo]]);

      const healthResult = createMockHealthResult('slo-1', true);
      computeHealthMock.mockResolvedValueOnce([healthResult]);

      await runHealthScan(
        { scanId: TEST_SCAN_ID },
        { scopedClusterClient, soClient: soClient as any, logger, abortController }
      );

      expect(scopedClusterClient.asInternalUser.bulk).toHaveBeenCalledWith(
        {
          operations: [
            { create: { _index: HEALTH_DATA_STREAM_NAME } },
            {
              '@timestamp': TEST_DATE.toISOString(),
              scanId: TEST_SCAN_ID,
              spaceId: 'custom-space',
              slo: {
                id: 'slo-1',
                revision: 1,
                name: 'SLO slo-1',
                enabled: true,
              },
              health: healthResult.health,
            },
          ],
          refresh: false,
        },
        { signal: abortController.signal }
      );
      expect(closeMock).toHaveBeenCalled();
    });

    it('should correctly count mix of healthy and problematic SLOs', async () => {
      const slos = [
        createMockStoredSLO('slo-1'),
        createMockStoredSLO('slo-2'),
        createMockStoredSLO('slo-3'),
        createMockStoredSLO('slo-4'),
      ];
      mockPointInTimeFinder([slos]);

      computeHealthMock.mockResolvedValueOnce([
        createMockHealthResult('slo-1', false),
        createMockHealthResult('slo-2', true),
        createMockHealthResult('slo-3', true),
        createMockHealthResult('slo-4', false),
      ]);

      const result = await runHealthScan(
        { scanId: TEST_SCAN_ID },
        { scopedClusterClient, soClient: soClient as any, logger, abortController }
      );

      expect(result).toEqual({ processed: 4, problematic: 2 });
    });
  });

  describe('pagination', () => {
    it('should iterate through multiple pages of SLOs', async () => {
      const page1 = [createMockStoredSLO('slo-1'), createMockStoredSLO('slo-2')];
      const page2 = [createMockStoredSLO('slo-3'), createMockStoredSLO('slo-4')];
      const page3 = [createMockStoredSLO('slo-5')];

      const { closeMock } = mockPointInTimeFinder([page1, page2, page3]);

      computeHealthMock
        .mockResolvedValueOnce([
          createMockHealthResult('slo-1', false),
          createMockHealthResult('slo-2', true),
        ])
        .mockResolvedValueOnce([
          createMockHealthResult('slo-3', false),
          createMockHealthResult('slo-4', false),
        ])
        .mockResolvedValueOnce([createMockHealthResult('slo-5', true)]);

      const result = await runHealthScan(
        { scanId: TEST_SCAN_ID },
        { scopedClusterClient, soClient: soClient as any, logger, abortController }
      );

      expect(result).toEqual({ processed: 5, problematic: 2 });
      expect(computeHealthMock).toHaveBeenCalledTimes(3);
      expect(scopedClusterClient.asInternalUser.bulk).toHaveBeenCalledTimes(3);
      expect(closeMock).toHaveBeenCalled();
    });

    it('should handle spaces correctly across pages', async () => {
      const page1 = [
        createMockStoredSLO('slo-1', ['space-a']),
        createMockStoredSLO('slo-2', ['space-b']),
      ];
      const page2 = [createMockStoredSLO('slo-3', ['space-a'])];

      mockPointInTimeFinder([page1, page2]);

      computeHealthMock
        .mockResolvedValueOnce([
          createMockHealthResult('slo-1', false),
          createMockHealthResult('slo-2', false),
        ])
        .mockResolvedValueOnce([createMockHealthResult('slo-3', false)]);

      await runHealthScan(
        { scanId: TEST_SCAN_ID },
        { scopedClusterClient, soClient: soClient as any, logger, abortController }
      );

      expect(scopedClusterClient.asInternalUser.bulk).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          operations: expect.arrayContaining([
            expect.objectContaining({
              spaceId: 'space-a',
              slo: expect.objectContaining({ id: 'slo-1' }),
            }),
            expect.objectContaining({
              spaceId: 'space-b',
              slo: expect.objectContaining({ id: 'slo-2' }),
            }),
          ]),
        }),
        expect.any(Object)
      );

      expect(scopedClusterClient.asInternalUser.bulk).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          operations: expect.arrayContaining([
            expect.objectContaining({
              spaceId: 'space-a',
              slo: expect.objectContaining({ id: 'slo-3' }),
            }),
          ]),
        }),
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should always close the finder even on error', async () => {
      const slo = createMockStoredSLO('slo-1');
      const { closeMock } = mockPointInTimeFinder([[slo]]);

      computeHealthMock.mockRejectedValueOnce(new Error('Test error'));

      await expect(
        runHealthScan(
          { scanId: TEST_SCAN_ID },
          { scopedClusterClient, soClient: soClient as any, logger, abortController }
        )
      ).rejects.toThrow('Test error');

      expect(closeMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('finder configuration', () => {
    it('should create finder with correct parameters', async () => {
      mockPointInTimeFinder([[]]);

      await runHealthScan(
        { scanId: TEST_SCAN_ID },
        { scopedClusterClient, soClient: soClient as any, logger, abortController }
      );

      expect(soClient.createPointInTimeFinder).toHaveBeenCalledWith({
        type: SO_SLO_TYPE,
        perPage: 500,
        namespaces: ['*'],
        fields: ['id', 'revision', 'name', 'enabled'],
      });
    });
  });

  describe('default spaceId handling', () => {
    it('should use default spaceId when namespaces is undefined', async () => {
      const slo: SavedObjectsFindResult<StoredSLODefinition> = {
        id: 'so-slo-1',
        type: SO_SLO_TYPE,
        references: [],
        score: 1,
        attributes: {
          id: 'slo-1',
          revision: 1,
          name: 'SLO 1',
          enabled: true,
        } as StoredSLODefinition,
      };

      mockPointInTimeFinder([[slo]]);
      computeHealthMock.mockResolvedValueOnce([createMockHealthResult('slo-1', false)]);

      await runHealthScan(
        { scanId: TEST_SCAN_ID },
        { scopedClusterClient, soClient: soClient as any, logger, abortController }
      );

      expect(scopedClusterClient.asInternalUser.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          operations: expect.arrayContaining([
            expect.objectContaining({
              spaceId: 'default',
              slo: expect.objectContaining({ id: 'slo-1' }),
            }),
          ]),
        }),
        expect.any(Object)
      );
    });
  });
});
