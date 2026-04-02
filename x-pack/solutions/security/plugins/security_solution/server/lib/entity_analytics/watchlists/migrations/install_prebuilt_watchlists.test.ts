/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  loggingSystemMock,
  savedObjectsClientMock as mockSavedObjectsClient,
  elasticsearchServiceMock,
} from '@kbn/core/server/mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { installPrebuiltWatchlists } from './install_prebuilt_watchlists';
import { PRIVILEGED_USER_WATCHLIST_ID } from '../../../../../common/entity_analytics/watchlists/constants';
import type { ExperimentalFeatures } from '../../../../../common/experimental_features';

const mockWatchlistGet = jest.fn();
const mockWatchlistCreate = jest.fn();
const mockAddEntitySourceReference = jest.fn();
const mockEntitySourceCreate = jest.fn();
const mockEntitySourceList = jest.fn();

jest.mock('../entity_sources/infra', () => ({
  WatchlistEntitySourceClient: jest.fn().mockImplementation(() => ({
    create: (...args: unknown[]) => mockEntitySourceCreate(...args),
    list: (...args: unknown[]) => mockEntitySourceList(...args),
  })),
}));

jest.mock('../management/watchlist_config', () => ({
  WatchlistConfigClient: jest.fn().mockImplementation(() => ({
    get: (...args: unknown[]) => mockWatchlistGet(...args),
    create: (...args: unknown[]) => mockWatchlistCreate(...args),
    addEntitySourceReference: (...args: unknown[]) => mockAddEntitySourceReference(...args),
  })),
}));

jest.mock('../../risk_score/tasks/helpers', () => ({
  buildScopedInternalSavedObjectsClientUnsafe: () => mockSavedObjectsClient.create(),
}));

const buildSpacesResponse = (spaceIds: string[]) => ({
  page: 1,
  per_page: 1000,
  total: spaceIds.length,
  saved_objects: spaceIds.map((id) => ({
    id,
    attributes: { name: id },
    type: 'space',
    references: [],
    score: 1,
  })),
});

const buildEmptySpacesResponse = () => ({
  page: 1,
  per_page: 1000,
  total: 0,
  saved_objects: [],
});

describe('installPrebuiltWatchlists', function () {
  const mockGetStartServices = jest.fn();
  const mockAuditLogger = auditLoggerMock.create();
  const mockLogger = loggingSystemMock.createLogger();
  const mockEsClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  const mockSoClient = mockSavedObjectsClient.create();

  const callInstall = () =>
    installPrebuiltWatchlists({
      auditLogger: mockAuditLogger,
      logger: mockLogger,
      getStartServices: mockGetStartServices,
      kibanaVersion: '9.0.0',
      experimentalFeatures: {
        entityAnalyticsWatchlistEnabled: true,
      } as ExperimentalFeatures,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    mockWatchlistCreate.mockResolvedValue({ id: PRIVILEGED_USER_WATCHLIST_ID });
    mockEntitySourceCreate.mockResolvedValue({ id: 'entity-source-id' });
    mockEntitySourceList.mockResolvedValue({ sources: [] });
    mockAddEntitySourceReference.mockResolvedValue(undefined);
    mockGetStartServices.mockResolvedValue([
      {
        savedObjects: {
          createInternalRepository: jest.fn().mockReturnValue(mockSoClient),
        },
        elasticsearch: {
          client: {
            asInternalUser: mockEsClient,
          },
        },
      },
    ]);
  });

  it('should install in default namespace even when no spaces are found', async () => {
    mockSoClient.find.mockResolvedValue(buildEmptySpacesResponse());
    mockWatchlistGet.mockRejectedValue(new Error('Saved object not found'));

    await callInstall();

    expect(mockWatchlistCreate).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(`Prebuilt watchlist '${PRIVILEGED_USER_WATCHLIST_ID}' initialized.`)
    );
  });

  it('should skip creation when the prebuilt watchlist already exists', async () => {
    mockSoClient.find.mockResolvedValue(buildSpacesResponse(['default']));
    mockWatchlistGet.mockResolvedValue({ id: PRIVILEGED_USER_WATCHLIST_ID });

    await callInstall();

    expect(mockWatchlistGet).toHaveBeenCalledWith(PRIVILEGED_USER_WATCHLIST_ID);
    expect(mockWatchlistCreate).not.toHaveBeenCalled();
  });

  it('should create the prebuilt watchlist when it does not exist', async () => {
    mockSoClient.find.mockResolvedValue(buildSpacesResponse(['default']));
    mockWatchlistGet.mockRejectedValue(new Error('Saved object not found'));

    await callInstall();

    expect(mockWatchlistCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: PRIVILEGED_USER_WATCHLIST_ID,
        description: 'System-managed watchlist for tracking privileged users',
        managed: true,
      }),
      { id: PRIVILEGED_USER_WATCHLIST_ID }
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(`Prebuilt watchlist '${PRIVILEGED_USER_WATCHLIST_ID}' initialized.`)
    );
  });

  it('should log an error when get throws a non-"not found" error', async () => {
    mockSoClient.find.mockResolvedValue(buildSpacesResponse(['default']));
    mockWatchlistGet.mockRejectedValue(new Error('Connection refused'));

    await callInstall();

    expect(mockWatchlistCreate).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(
        `Error checking prebuilt watchlist '${PRIVILEGED_USER_WATCHLIST_ID}': Connection refused`
      )
    );
  });

  it('should install prebuilt watchlists in multiple namespaces', async () => {
    mockSoClient.find.mockResolvedValue(buildSpacesResponse(['default', 'space-1']));
    mockWatchlistGet.mockRejectedValue(new Error('Saved object not found'));

    await callInstall();

    expect(mockWatchlistCreate).toHaveBeenCalledTimes(2);
  });

  it('should deduplicate default namespace when it appears in spaces response', async () => {
    mockSoClient.find.mockResolvedValue(buildSpacesResponse(['default', 'space-1']));
    mockWatchlistGet.mockRejectedValue(new Error('Saved object not found'));

    await callInstall();

    // default is in the spaces response AND always added — should still only run twice, not three times
    expect(mockWatchlistCreate).toHaveBeenCalledTimes(2);
  });
});
