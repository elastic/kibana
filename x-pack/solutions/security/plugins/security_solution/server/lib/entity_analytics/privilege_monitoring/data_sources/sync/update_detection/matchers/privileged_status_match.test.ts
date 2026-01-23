/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MonitoringEntitySource,
  MonitoringLabel,
} from '../../../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PrivMatchersAggregation } from '../types';
import { createPatternMatcherService } from './privileged_status_match';

const mockBuildPrivilegedSearchBody = jest.fn();
jest.mock('../queries', () => ({
  buildPrivilegedSearchBody: (...args: unknown[]) => mockBuildPrivilegedSearchBody(...args),
}));

type GenerateMonitoringLabelsFn =
  typeof import('./generate_monitoring_labels').generateMonitoringLabels;
const mockGenerateMonitoringLabels = jest.fn<
  MonitoringLabel[],
  Parameters<GenerateMonitoringLabelsFn>
>(() => []);
jest.mock('./generate_monitoring_labels', () => ({
  generateMonitoringLabels: (...args: Parameters<GenerateMonitoringLabelsFn>) =>
    mockGenerateMonitoringLabels(...args),
}));

const mockSearchService = {
  getExistingUsersMap: jest.fn(),
};
jest.mock('../../../../users/search', () => ({
  createSearchService: () => mockSearchService,
}));

const mockSyncMarkersService = {
  getLastProcessedMarker: jest.fn(),
  updateLastProcessedMarker: jest.fn(),
};
jest.mock('../../sync_markers', () => ({
  createSyncMarkersService: () => mockSyncMarkersService,
}));

const createDataClient = (): PrivilegeMonitoringDataClient =>
  ({
    deps: {
      clusterClient: {
        asCurrentUser: {
          search: jest.fn(),
        },
      },
    },
    index: 'unit-test-index',
    log: jest.fn(),
  } as unknown as PrivilegeMonitoringDataClient);

// Defaults to integration type source, can be overridden for index usage.
const createSource = (overrides: Partial<MonitoringEntitySource> = {}): MonitoringEntitySource => ({
  id: 'source-id',
  type: 'entity_analytics_integration', // or 'index' override.
  indexPattern: 'test-index-',
  matchers: [],
  ...overrides,
});

beforeEach(() => {
  jest.resetAllMocks();
});

describe('createPatternMatcherService', () => {
  const soClient = {} as SavedObjectsClientContract;

  it('calls sync marker updates in integrations mode, when there are matchers', async () => {
    const dataClient = createDataClient();
    const searchMock = dataClient.deps.clusterClient.asCurrentUser.search as jest.Mock;
    const source = createSource({
      matchers: [
        {
          fields: ['user.role'],
          values: ['admin'],
        },
      ],
    });

    mockSyncMarkersService.getLastProcessedMarker.mockResolvedValue(undefined);
    mockSearchService.getExistingUsersMap.mockResolvedValue(new Map());
    mockBuildPrivilegedSearchBody.mockReturnValue({ body: 'query' });
    const aggregationResponse: PrivMatchersAggregation = {
      privileged_user_status_since_last_run: {
        buckets: [
          {
            key: { username: 'test-user' },
            doc_count: 1,
            latest_doc_for_user: {
              hits: {
                hits: [
                  {
                    _source: {
                      '@timestamp': '2024-01-01T00:00:00Z',
                      user: { name: 'test-user', is_privileged: false },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    };
    searchMock.mockResolvedValue({ aggregations: aggregationResponse });

    const service = createPatternMatcherService({
      dataClient,
      soClient,
      sourceType: 'entity_analytics_integration',
    });
    const result = await service.findPrivilegedUsersFromMatchers(source);

    expect(mockSyncMarkersService.getLastProcessedMarker).toHaveBeenCalledWith(source);
    expect(mockSyncMarkersService.updateLastProcessedMarker).toHaveBeenCalledWith(
      source,
      '2024-01-01T00:00:00Z'
    );
    expect(result).toHaveLength(1);
  });

  it('processes index mode even when matchers are empty and skips sync marker updates', async () => {
    const dataClient = createDataClient();
    const searchMock = dataClient.deps.clusterClient.asCurrentUser.search as jest.Mock;
    const source = createSource({ type: 'index', matchers: [] }); // update to index source.

    mockSearchService.getExistingUsersMap.mockResolvedValue(new Map());
    mockBuildPrivilegedSearchBody.mockReturnValue({ body: 'query' });
    const aggregationResponse: PrivMatchersAggregation = {
      privileged_user_status_since_last_run: {
        buckets: [
          {
            key: { username: 'Chewbacca' },
            doc_count: 1,
            latest_doc_for_user: {
              hits: {
                hits: [
                  {
                    _source: {
                      '@timestamp': '2024-01-01T00:00:00Z',
                      user: { name: 'Chewbacca', is_privileged: true },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    };
    searchMock.mockResolvedValue({ aggregations: aggregationResponse });

    const service = createPatternMatcherService({
      dataClient,
      soClient,
      sourceType: 'index',
    });

    const result = await service.findPrivilegedUsersFromMatchers(source);

    expect(mockBuildPrivilegedSearchBody).toHaveBeenCalledWith([], undefined, undefined, 100);
    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(mockSyncMarkersService.getLastProcessedMarker).not.toHaveBeenCalled();
    expect(mockSyncMarkersService.updateLastProcessedMarker).not.toHaveBeenCalled();
  });
});
