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

const mockWatchlistGet = jest.fn();
const mockWatchlistCreate = jest.fn();

jest.mock('../management/watchlist_config', () => ({
  WatchlistConfigClient: jest.fn().mockImplementation(() => ({
    get: (...args: unknown[]) => mockWatchlistGet(...args),
    create: (...args: unknown[]) => mockWatchlistCreate(...args),
  })),
}));

jest.mock('../../risk_score/tasks/helpers', () => ({
  buildScopedInternalSavedObjectsClientUnsafe: () => mockSavedObjectsClient.create(),
}));

const buildSavedObjectResponse = (namespaces: string[] = ['default']) => ({
  page: 1,
  per_page: 100,
  total: namespaces.length,
  saved_objects: namespaces.map((namespace) => ({
    namespaces: [namespace],
    attributes: {},
    id: 'id',
    type: 'entity-engine-descriptor-v2',
    references: [],
    score: 1,
  })),
});

const buildEmptyResponse = () => ({
  page: 1,
  per_page: 100,
  total: 0,
  saved_objects: [],
});

describe('installPrebuiltWatchlists', () => {
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
    });

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('should skip installation when no entity engine descriptors exist', async () => {
    mockSoClient.find.mockResolvedValue(buildEmptyResponse());

    await callInstall();

    expect(mockLogger.debug).toHaveBeenCalledWith(
      'No entity engine descriptors found. Skipping prebuilt watchlist installation.'
    );
    expect(mockWatchlistGet).not.toHaveBeenCalled();
    expect(mockWatchlistCreate).not.toHaveBeenCalled();
  });

  it('should skip creation when the prebuilt watchlist already exists', async () => {
    mockSoClient.find.mockResolvedValue(buildSavedObjectResponse(['default']));
    mockWatchlistGet.mockResolvedValue({ id: PRIVILEGED_USER_WATCHLIST_ID });

    await callInstall();

    expect(mockWatchlistGet).toHaveBeenCalledWith(PRIVILEGED_USER_WATCHLIST_ID);
    expect(mockWatchlistCreate).not.toHaveBeenCalled();
  });

  it('should create the prebuilt watchlist when it does not exist', async () => {
    mockSoClient.find.mockResolvedValue(buildSavedObjectResponse(['default']));
    mockWatchlistGet.mockRejectedValue(new Error('Saved object not found'));

    await callInstall();

    expect(mockWatchlistCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Privileged Users',
        description: 'System-managed watchlist for tracking privileged users',
        managed: true,
      }),
      { id: PRIVILEGED_USER_WATCHLIST_ID }
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(
        'Prebuilt watchlist \'Privileged Users\' initialized in namespace "default"'
      )
    );
  });

  it('should log an error when get throws a non-"not found" error', async () => {
    mockSoClient.find.mockResolvedValue(buildSavedObjectResponse(['default']));
    mockWatchlistGet.mockRejectedValue(new Error('Connection refused'));

    await callInstall();

    expect(mockWatchlistCreate).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(
        'Error checking prebuilt watchlist \'Privileged Users\' in namespace "default": Connection refused'
      )
    );
  });

  it('should log an error when a saved object has no namespace', async () => {
    const response = buildSavedObjectResponse([]);
    mockSoClient.find.mockResolvedValue({
      ...response,
      total: 1,
      saved_objects: [
        {
          ...response.saved_objects[0],
          namespaces: [],
        },
      ],
    });

    await callInstall();

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Unexpected saved object. Entity engine descriptor saved objects must have a namespace'
    );
    expect(mockWatchlistGet).not.toHaveBeenCalled();
  });

  it('should install prebuilt watchlists in multiple namespaces', async () => {
    mockSoClient.find.mockResolvedValue(buildSavedObjectResponse(['default', 'space-1']));
    mockWatchlistGet.mockRejectedValue(new Error('Saved object not found'));

    await callInstall();

    expect(mockWatchlistCreate).toHaveBeenCalledTimes(2);
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('initialized in namespace "default"')
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('initialized in namespace "space-1"')
    );
  });
});
