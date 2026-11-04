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
import { installPrebuiltWatchlists, getPrebuiltWatchlists } from './install_prebuilt_watchlists';
import {
  getPrivilegedUserWatchlistSavedObjectId,
  PRIVILEGED_USER_WATCHLIST_NAME,
} from '../../../../../common/entity_analytics/watchlists/constants';
import type { ExperimentalFeatures } from '../../../../../common/experimental_features';

// Must match watchlistConfigTypeName in the source
const WATCHLIST_CONFIG_TYPE_NAME = 'watchlist-config';

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

// Captured reference so tests can control soClient behaviour (e.g. cleanup checks)
let mockScopedSoClient: ReturnType<typeof mockSavedObjectsClient.create>;

jest.mock('../../risk_score/tasks/helpers', () => ({
  buildScopedInternalSavedObjectsClientUnsafe: jest.fn(() => mockScopedSoClient),
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
  let mockCreateInternalRepository: jest.Mock;

  const callInstall = () =>
    installPrebuiltWatchlists({
      auditLogger: mockAuditLogger,
      logger: mockLogger,
      getStartServices: mockGetStartServices,
      kibanaVersion: '9.0.0',
      hasEncryptionKey: true,
      experimentalFeatures: {
        entityAnalyticsWatchlistEnabled: true,
      } as ExperimentalFeatures,
    });

  const emptyFindResponse = () => ({
    saved_objects: [],
    total: 0,
    page: 1,
    per_page: 10,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockScopedSoClient = mockSavedObjectsClient.create();
    // Default: find returns nothing, so the fast-path (canonical ID check via watchlistClient.get)
    // is the only lookup that matters for existing tests.
    mockScopedSoClient.find.mockResolvedValue(emptyFindResponse());
    mockWatchlistCreate.mockImplementation(async (_attrs, opts?: { id?: string }) => {
      if (!opts?.id) {
        throw new Error('Prebuilt watchlist creation must always pass a deterministic id');
      }

      return { id: opts.id };
    });
    mockEntitySourceCreate.mockResolvedValue({ id: 'entity-source-id' });
    mockEntitySourceList.mockResolvedValue({ sources: [] });
    mockAddEntitySourceReference.mockResolvedValue(undefined);
    // Mirror core `find` behavior: the hidden `space` type is only queryable when
    // it is explicitly passed via `includedHiddenTypes`; otherwise `find` returns
    // an empty result. This guards against regressing back to an un-scoped repo.
    mockCreateInternalRepository = jest
      .fn()
      .mockImplementation((includedHiddenTypes?: string[]) => {
        if (includedHiddenTypes?.includes('space')) {
          return mockSoClient;
        }
        const repoWithoutSpaceAccess = mockSavedObjectsClient.create();
        repoWithoutSpaceAccess.find.mockResolvedValue(buildEmptySpacesResponse());
        return repoWithoutSpaceAccess;
      });
    mockGetStartServices.mockResolvedValue([
      {
        savedObjects: {
          createInternalRepository: mockCreateInternalRepository,
        },
        elasticsearch: {
          client: {
            asInternalUser: mockEsClient,
          },
        },
      },
    ]);
  });

  it('requests the hidden space saved object type so custom spaces are discovered', async () => {
    mockSoClient.find.mockResolvedValue(buildSpacesResponse(['default', 'custom-space']));
    mockWatchlistGet.mockRejectedValue(new Error('Saved object not found'));

    await callInstall();

    expect(mockCreateInternalRepository).toHaveBeenCalledWith(['space']);
    // default + custom-space
    expect(mockWatchlistCreate).toHaveBeenCalledTimes(2);
  });

  it('should install in default namespace even when no spaces are found', async () => {
    mockSoClient.find.mockResolvedValue(buildEmptySpacesResponse());
    mockWatchlistGet.mockRejectedValue(new Error('Saved object not found'));

    await callInstall();

    expect(mockWatchlistCreate).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(`Prebuilt watchlist '${PRIVILEGED_USER_WATCHLIST_NAME}' initialized.`)
    );
  });

  it('should skip creation when the prebuilt watchlist already exists', async () => {
    mockSoClient.find.mockResolvedValue(buildSpacesResponse(['default']));
    mockWatchlistGet.mockResolvedValue({
      id: getPrivilegedUserWatchlistSavedObjectId('default'),
    });

    await callInstall();

    expect(mockWatchlistGet).toHaveBeenCalledWith(
      getPrivilegedUserWatchlistSavedObjectId('default')
    );
    expect(mockWatchlistCreate).not.toHaveBeenCalled();
  });

  it('should create the prebuilt watchlist when it does not exist', async () => {
    mockSoClient.find.mockResolvedValue(buildSpacesResponse(['default']));
    mockWatchlistGet.mockRejectedValue(new Error('Saved object not found'));

    await callInstall();

    expect(mockWatchlistCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: PRIVILEGED_USER_WATCHLIST_NAME,
        description: 'System-managed watchlist for tracking privileged users',
        managed: true,
      }),
      { id: getPrivilegedUserWatchlistSavedObjectId('default') }
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(`Prebuilt watchlist '${PRIVILEGED_USER_WATCHLIST_NAME}' initialized.`)
    );
  });

  it('should log an error when get throws a non-"not found" error', async () => {
    mockSoClient.find.mockResolvedValue(buildSpacesResponse(['default']));
    mockWatchlistGet.mockRejectedValue(new Error('Connection refused'));

    await callInstall();

    expect(mockWatchlistCreate).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(
        `Error checking prebuilt watchlist '${PRIVILEGED_USER_WATCHLIST_NAME}': Connection refused`
      )
    );
  });

  it('should install prebuilt watchlists in multiple namespaces', async () => {
    mockSoClient.find.mockResolvedValue(buildSpacesResponse(['default', 'space-1']));
    mockWatchlistGet.mockRejectedValue(new Error('Saved object not found'));

    await callInstall();

    expect(mockWatchlistCreate).toHaveBeenCalledTimes(2);
  });

  it('should create integration entity sources with managed: true', async () => {
    mockSoClient.find.mockResolvedValue(buildSpacesResponse(['default']));
    mockWatchlistGet.mockRejectedValue(new Error('Saved object not found'));

    await callInstall();

    // Both okta and ad entity sources should be created with managed: true
    expect(mockEntitySourceCreate).toHaveBeenCalledTimes(2);
    expect(mockEntitySourceCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'okta', managed: true })
    );
    expect(mockEntitySourceCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'ad', managed: true })
    );
  });

  it('entity source index patterns use each space namespace', async () => {
    mockSoClient.find.mockResolvedValue(buildSpacesResponse(['space-2']));
    mockWatchlistGet.mockRejectedValue(new Error('Saved object not found'));

    await callInstall();

    expect(mockEntitySourceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'okta',
        indexPattern: 'logs-entityanalytics_okta.user-default',
      })
    );
    expect(mockEntitySourceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ad',
        indexPattern: 'logs-entityanalytics_ad.user-default',
      })
    );
    expect(mockEntitySourceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'okta',
        indexPattern: 'logs-entityanalytics_okta.user-space-2',
      })
    );
    expect(mockEntitySourceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ad',
        indexPattern: 'logs-entityanalytics_ad.user-space-2',
      })
    );
  });

  it('should deduplicate default namespace when it appears in spaces response', async () => {
    mockSoClient.find.mockResolvedValue(buildSpacesResponse(['default', 'space-1']));
    mockWatchlistGet.mockRejectedValue(new Error('Saved object not found'));

    await callInstall();

    // default is in the spaces response AND always added — should still only run twice, not three times
    expect(mockWatchlistCreate).toHaveBeenCalledTimes(2);
  });

  describe('find-by-attribute fallback', () => {
    const buildFindResult = (id: string, referenceCount = 0, createdAt = '2024-01-01') => ({
      id,
      type: WATCHLIST_CONFIG_TYPE_NAME,
      attributes: { name: PRIVILEGED_USER_WATCHLIST_NAME, managed: true },
      references: Array.from({ length: referenceCount }, (_, i) => ({
        id: `source-${i}`,
        name: `entity-source_source-${i}`,
        type: 'watchlist-entity-source',
      })),
      created_at: createdAt,
      score: 0,
    });

    it('reuses the watchlist found by attribute when the canonical ID is not found', async () => {
      const LEGACY_ID = 'privileged-user-monitoring-watchlist-id';
      mockSoClient.find.mockResolvedValue(buildSpacesResponse(['default']));
      mockWatchlistGet.mockRejectedValue(new Error('Saved object not found'));
      mockScopedSoClient.find.mockResolvedValue({
        saved_objects: [buildFindResult(LEGACY_ID, 3)],
        total: 1,
        page: 1,
        per_page: 10,
      });

      await callInstall();

      expect(mockWatchlistCreate).not.toHaveBeenCalled();
      expect(mockAddEntitySourceReference).toHaveBeenCalledWith(LEGACY_ID, expect.any(String));
    });

    it('keeps the oldest watchlist when duplicates exist and deletes the rest', async () => {
      const REAL_ID = 'privileged-user-monitoring-watchlist-id';
      const DUPE_ID = 'privileged-user-monitoring-watchlist-id-default';
      mockSoClient.find.mockResolvedValue(buildSpacesResponse(['default']));
      mockWatchlistGet.mockRejectedValue(new Error('Saved object not found'));
      mockScopedSoClient.find.mockResolvedValue({
        // Real watchlist is older; duplicate was created later on upgrade
        saved_objects: [
          buildFindResult(DUPE_ID, 2, '2025-05-12'),
          buildFindResult(REAL_ID, 3, '2025-04-20'),
        ],
        total: 2,
        page: 1,
        per_page: 10,
      });
      mockScopedSoClient.delete.mockResolvedValue({});

      await callInstall();

      expect(mockScopedSoClient.delete).toHaveBeenCalledWith(WATCHLIST_CONFIG_TYPE_NAME, DUPE_ID, {
        refresh: 'wait_for',
      });
      expect(mockScopedSoClient.delete).not.toHaveBeenCalledWith(
        WATCHLIST_CONFIG_TYPE_NAME,
        REAL_ID,
        expect.anything()
      );
      expect(mockWatchlistCreate).not.toHaveBeenCalled();
      expect(mockAddEntitySourceReference).toHaveBeenCalledWith(REAL_ID, expect.any(String));
    });

    it('creates with the canonical ID when no managed watchlist is found by attribute', async () => {
      mockSoClient.find.mockResolvedValue(buildSpacesResponse(['default']));
      mockWatchlistGet.mockRejectedValue(new Error('Saved object not found'));
      // mockScopedSoClient.find already returns empty by default from beforeEach

      await callInstall();

      expect(mockWatchlistCreate).toHaveBeenCalledWith(expect.anything(), {
        id: getPrivilegedUserWatchlistSavedObjectId('default'),
      });
    });

    it('works independently per namespace with no cross-space interference', async () => {
      mockSoClient.find.mockResolvedValue(buildSpacesResponse(['space-1']));
      mockWatchlistGet.mockRejectedValue(new Error('Saved object not found'));
      // find returns empty → both default and space-1 create fresh
      // (space-1's canonical ID must not be confused with default's)

      await callInstall();

      expect(mockWatchlistCreate).toHaveBeenCalledTimes(2);
      expect(mockWatchlistCreate).toHaveBeenCalledWith(expect.anything(), {
        id: getPrivilegedUserWatchlistSavedObjectId('space-1'),
      });
    });
  });

  describe('with spaceId defined', () => {
    it('skips space discovery and installs only for the specified space', async () => {
      mockWatchlistGet.mockRejectedValue(new Error('Saved object not found'));

      await installPrebuiltWatchlists({
        auditLogger: mockAuditLogger,
        logger: mockLogger,
        getStartServices: mockGetStartServices,
        kibanaVersion: '9.0.0',
        hasEncryptionKey: true,
        spaceId: 'my-space',
      });

      // Space discovery should be skipped — no call with the hidden 'space' type
      expect(mockCreateInternalRepository).not.toHaveBeenCalledWith(['space']);
      // Only one watchlist created — for 'my-space', not for 'default' or any other space
      expect(mockWatchlistCreate).toHaveBeenCalledTimes(1);
      expect(mockWatchlistCreate).toHaveBeenCalledWith(expect.anything(), {
        id: getPrivilegedUserWatchlistSavedObjectId('my-space'),
      });
    });
  });

  it('has no duplicate prebuilt watchlist names', () => {
    const names = getPrebuiltWatchlists('default').map((w) => w.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('registers an index template for .entity_analytics.watchlists.*', async () => {
    mockSoClient.find.mockResolvedValue(buildEmptySpacesResponse());
    mockWatchlistGet.mockRejectedValue(new Error('not found'));

    await callInstall();

    expect(mockEsClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'entity_analytics_watchlists',
        index_patterns: ['.entity_analytics.watchlists.*'],
      })
    );
  });
});
