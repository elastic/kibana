/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import { IndexPatternAdapter, IndexAdapter } from '@kbn/index-adapter';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { Subject } from 'rxjs';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import type { RuleMigrationIndexNameProviders } from '../types';
import type { SetupParams } from './rule_migrations_data_service';
import { RuleMigrationsDataService } from './rule_migrations_data_service';
import { RuleMigrationIndexMigrator } from '../index_migrators';

jest.mock('../index_migrators');

jest.mock('@kbn/index-adapter');

// This mock is required to have a way to await the index pattern name promise
let mockIndexNameProviders: RuleMigrationIndexNameProviders;
jest.mock('./rule_migrations_data_client', () => ({
  RuleMigrationsDataClient: jest.fn((indexNameProviders: RuleMigrationIndexNameProviders) => {
    mockIndexNameProviders = indexNameProviders;
  }),
}));

// @ts-expect-error accessing protected property
const INDEX_PATTERN = new RuleMigrationsDataService().baseIndexName;

const MockedIndexPatternAdapter = IndexPatternAdapter as unknown as jest.MockedClass<
  typeof IndexPatternAdapter
>;
const MockedIndexAdapter = IndexAdapter as unknown as jest.MockedClass<typeof IndexAdapter>;

const dependencies = {} as SiemMigrationsClientDependencies;
const esClient = elasticsearchServiceMock.createStart().client.asInternalUser;
const getComponentTemplate = (adapter: IndexAdapter) =>
  (adapter.setComponentTemplate as jest.Mock).mock.calls[0][0];

describe('SiemRuleMigrationsDataService', () => {
  const kibanaVersion = '8.16.0';
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create IndexPatternAdapters', () => {
      new RuleMigrationsDataService(logger, kibanaVersion);
      expect(MockedIndexPatternAdapter).toHaveBeenCalledTimes(3);
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

    it('should create ELSER component templates with the default ELSER inference endpoint', () => {
      new RuleMigrationsDataService(logger, kibanaVersion);
      const [integrationsAdapter, prebuiltRulesAdapter] = MockedIndexAdapter.mock.instances;

      expect(getComponentTemplate(integrationsAdapter)).toEqual(
        expect.objectContaining({
          fieldMap: expect.objectContaining({
            elser_embedding: expect.objectContaining({
              type: 'semantic_text',
              inference_id: defaultInferenceEndpoints.ELSER,
            }),
          }),
        })
      );
      expect(getComponentTemplate(prebuiltRulesAdapter)).toEqual(
        expect.objectContaining({
          fieldMap: expect.objectContaining({
            elser_embedding: expect.objectContaining({
              type: 'semantic_text',
              inference_id: defaultInferenceEndpoints.ELSER,
            }),
          }),
        })
      );
    });

    it('should create ELSER component templates with the configured ELSER inference endpoint', () => {
      const elserInferenceId = 'pt_tiny_elser_elasticsearch';
      new RuleMigrationsDataService(logger, kibanaVersion, elserInferenceId);
      const [integrationsAdapter, prebuiltRulesAdapter] = MockedIndexAdapter.mock.instances;

      expect(getComponentTemplate(integrationsAdapter)).toEqual(
        expect.objectContaining({
          fieldMap: expect.objectContaining({
            elser_embedding: expect.objectContaining({
              type: 'semantic_text',
              inference_id: elserInferenceId,
            }),
          }),
        })
      );
      expect(getComponentTemplate(prebuiltRulesAdapter)).toEqual(
        expect.objectContaining({
          fieldMap: expect.objectContaining({
            elser_embedding: expect.objectContaining({
              type: 'semantic_text',
              inference_id: elserInferenceId,
            }),
          }),
        })
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
    it('should install index pattern and run the migration', async () => {
      const service = new RuleMigrationsDataService(logger, kibanaVersion);
      const params: SetupParams = {
        esClient,
        pluginStop$: new Subject(),
      };
      await service.setup(params);
      const [indexPatternAdapter] = MockedIndexPatternAdapter.mock.instances;
      const [indexAdapter] = MockedIndexAdapter.mock.instances;

      expect(indexPatternAdapter.install).toHaveBeenCalledWith(expect.objectContaining(params));
      expect(indexAdapter.install).toHaveBeenCalledWith(expect.objectContaining(params));
      expect(RuleMigrationIndexMigrator).toHaveBeenCalled();
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
      const params: SetupParams = {
        esClient,
        pluginStop$: new Subject(),
      };

      const [rulesIndexPatternAdapter, resourcesIndexPatternAdapter, migrationIndexPatternAdapter] =
        MockedIndexPatternAdapter.mock.instances;
      (rulesIndexPatternAdapter.install as jest.Mock).mockResolvedValueOnce(undefined);

      await service.setup(params);
      service.createClient(createClientParams);

      await mockIndexNameProviders.rules();
      await mockIndexNameProviders.resources();
      await mockIndexNameProviders.migrations();

      expect(rulesIndexPatternAdapter.createIndex).toHaveBeenCalledWith('space1');
      expect(rulesIndexPatternAdapter.getIndexName).toHaveBeenCalledWith('space1');

      expect(resourcesIndexPatternAdapter.createIndex).toHaveBeenCalledWith('space1');
      expect(resourcesIndexPatternAdapter.getIndexName).toHaveBeenCalledWith('space1');

      expect(migrationIndexPatternAdapter.createIndex).toHaveBeenCalledWith('space1');
      expect(migrationIndexPatternAdapter.getIndexName).toHaveBeenCalledWith('space1');
    });
  });
});
