/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import type { InstallParams } from '@kbn/index-adapter';
import { IndexPatternAdapter, IndexAdapter } from '@kbn/index-adapter';
import { loggerMock } from '@kbn/logging-mocks';
import { Subject } from 'rxjs';
import type { SiemRuleMigrationsClientDependencies } from '../types';
import type { IndexNameProviders } from './rule_migrations_data_client';
import { INDEX_PATTERN, RuleMigrationsDataService } from './rule_migrations_data_service';

jest.mock('@kbn/index-adapter');

// This mock is required to have a way to await the index pattern name promise
let mockIndexNameProviders: IndexNameProviders;
jest.mock('./rule_migrations_data_client', () => ({
  RuleMigrationsDataClient: jest.fn((indexNameProviders: IndexNameProviders) => {
    mockIndexNameProviders = indexNameProviders;
  }),
}));

const MockedIndexPatternAdapter = IndexPatternAdapter as unknown as jest.MockedClass<
  typeof IndexPatternAdapter
>;
const MockedIndexAdapter = IndexAdapter as unknown as jest.MockedClass<typeof IndexAdapter>;

const dependencies = {} as SiemRuleMigrationsClientDependencies;
const esClient = elasticsearchServiceMock.createStart().client.asInternalUser;

describe('SiemRuleMigrationsDataService', () => {
  const kibanaVersion = '8.16.0';
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create IndexPatternAdapters', () => {
      new RuleMigrationsDataService(logger, kibanaVersion);
      expect(MockedIndexPatternAdapter).toHaveBeenCalledTimes(2);
      expect(MockedIndexAdapter).toHaveBeenCalledTimes(2);
    });

    it('should create component templates', () => {
      new RuleMigrationsDataService(logger, kibanaVersion);
      const [rulesAdapter, resourcesAdapter] = MockedIndexPatternAdapter.mock.instances;
      const [integrationsAdapter, prebuiltRulesAdapter] = MockedIndexAdapter.mock.instances;
      expect(rulesAdapter.setComponentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: `${INDEX_PATTERN}-rules` })
      );
      expect(resourcesAdapter.setComponentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: `${INDEX_PATTERN}-resources` })
      );
      expect(integrationsAdapter.setComponentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: `${INDEX_PATTERN}-integrations` })
      );
      expect(prebuiltRulesAdapter.setComponentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: `${INDEX_PATTERN}-prebuiltrules` })
      );
    });

    it('should create index templates', () => {
      new RuleMigrationsDataService(logger, kibanaVersion);
      const [rulesAdapter, resourcesAdapter] = MockedIndexPatternAdapter.mock.instances;
      const [integrationsAdapter, prebuiltRulesAdapter] = MockedIndexAdapter.mock.instances;
      expect(rulesAdapter.setIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: `${INDEX_PATTERN}-rules` })
      );
      expect(resourcesAdapter.setIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: `${INDEX_PATTERN}-resources` })
      );
      expect(integrationsAdapter.setIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: `${INDEX_PATTERN}-integrations` })
      );
      expect(prebuiltRulesAdapter.setIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: `${INDEX_PATTERN}-prebuiltrules` })
      );
    });
  });

  describe('install', () => {
    it('should install index pattern', async () => {
      const service = new RuleMigrationsDataService(logger, kibanaVersion);
      const params: Omit<InstallParams, 'logger'> = {
        esClient,
        pluginStop$: new Subject(),
      };
      await service.install(params);
      const [indexPatternAdapter] = MockedIndexPatternAdapter.mock.instances;
      const [indexAdapter] = MockedIndexAdapter.mock.instances;

      expect(indexPatternAdapter.install).toHaveBeenCalledWith(expect.objectContaining(params));
      expect(indexAdapter.install).toHaveBeenCalledWith(expect.objectContaining(params));
    });
  });

  describe('createClient', () => {
    const currentUser = securityServiceMock.createMockAuthenticatedUser();
    const createClientParams = {
      spaceId: 'space1',
      currentUser,
      esScopedClient: elasticsearchServiceMock.createStart().client.asScoped(),
      dependencies,
    };

    it('should install space index pattern', async () => {
      const service = new RuleMigrationsDataService(logger, kibanaVersion);
      const params: InstallParams = {
        esClient,
        logger: loggerMock.create(),
        pluginStop$: new Subject(),
      };
      const [rulesIndexPatternAdapter, resourcesIndexPatternAdapter] =
        MockedIndexPatternAdapter.mock.instances;
      (rulesIndexPatternAdapter.install as jest.Mock).mockResolvedValueOnce(undefined);

      await service.install(params);
      service.createClient(createClientParams);

      await mockIndexNameProviders.rules();
      await mockIndexNameProviders.resources();

      expect(rulesIndexPatternAdapter.createIndex).toHaveBeenCalledWith('space1');
      expect(rulesIndexPatternAdapter.getIndexName).toHaveBeenCalledWith('space1');

      expect(resourcesIndexPatternAdapter.createIndex).toHaveBeenCalledWith('space1');
      expect(resourcesIndexPatternAdapter.getIndexName).toHaveBeenCalledWith('space1');
    });
  });
});
