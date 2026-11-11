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

const INDEX_PATTERN = '.kibana-siem-rule-migrations';

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
  const createClientParams = {
    spaceId: 'space1',
    currentUser: securityServiceMock.createMockAuthenticatedUser(),
    esScopedClient: elasticsearchServiceMock.createStart().client.asScoped(),
    dependencies,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    esClient.inference.get.mockReset().mockResolvedValue({ endpoints: [] });
  });

  describe('constructor', () => {
    it('should not create any adapter before setup', () => {
      new RuleMigrationsDataService(logger, kibanaVersion);
      expect(MockedIndexPatternAdapter).not.toHaveBeenCalled();
      expect(MockedIndexAdapter).not.toHaveBeenCalled();
    });

    it('should throw when used before setup', () => {
      const service = new RuleMigrationsDataService(logger, kibanaVersion);
      expect(() => service.createClient(createClientParams)).toThrow(
        'Service not initialized, please call setup first'
      );
    });
  });

  describe('setup', () => {
    it('should create every adapter exactly once', async () => {
      const service = new RuleMigrationsDataService(logger, kibanaVersion);
      await service.setup({ esClient, pluginStop$: new Subject() });
      expect(MockedIndexPatternAdapter).toHaveBeenCalledTimes(3);
      expect(MockedIndexAdapter).toHaveBeenCalledTimes(2);
    });

    it('should create component templates', async () => {
      const service = new RuleMigrationsDataService(logger, kibanaVersion);
      await service.setup({ esClient, pluginStop$: new Subject() });
      const [migrationsAdapter, rulesAdapter, resourcesAdapter] =
        MockedIndexPatternAdapter.mock.instances;
      const [integrationsAdapter, prebuiltRulesAdapter] = MockedIndexAdapter.mock.instances;
      expect(migrationsAdapter.setComponentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: `${INDEX_PATTERN}-migrations` })
      );
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

    it('should create ELSER component templates with the default ELSER inference endpoint', async () => {
      const service = new RuleMigrationsDataService(logger, kibanaVersion);
      await service.setup({ esClient, pluginStop$: new Subject() });
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

    it('should create ELSER component templates with the configured ELSER inference endpoint', async () => {
      const elserInferenceId = 'pt_tiny_elser_elasticsearch';
      const service = new RuleMigrationsDataService(logger, kibanaVersion, elserInferenceId);
      await service.setup({ esClient, pluginStop$: new Subject() });
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

    it('should create index templates', async () => {
      const service = new RuleMigrationsDataService(logger, kibanaVersion);
      await service.setup({ esClient, pluginStop$: new Subject() });
      const [migrationsAdapter, rulesAdapter, resourcesAdapter] =
        MockedIndexPatternAdapter.mock.instances;
      const [integrationsAdapter, prebuiltRulesAdapter] = MockedIndexAdapter.mock.instances;
      expect(migrationsAdapter.setIndexTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: `${INDEX_PATTERN}-migrations` })
      );
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
    it('should install every adapter and run the migration', async () => {
      const service = new RuleMigrationsDataService(logger, kibanaVersion);
      const params: SetupParams = {
        esClient,
        pluginStop$: new Subject(),
      };
      await service.setup(params);

      for (const adapter of [
        ...MockedIndexPatternAdapter.mock.instances,
        ...MockedIndexAdapter.mock.instances,
      ]) {
        expect(adapter.install).toHaveBeenCalledTimes(1);
        expect(adapter.install).toHaveBeenCalledWith(expect.objectContaining(params));
      }
      expect(RuleMigrationIndexMigrator).toHaveBeenCalled();
    });
  });

  describe('endpoint selection during setup', () => {
    it.each([
      [undefined, defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID],
      ['custom-elser', 'custom-elser'],
    ])('installs the resolved endpoint with override %s', async (configuredId, expectedId) => {
      esClient.inference.get.mockResolvedValue({
        endpoints: [
          {
            inference_id: defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
            service: 'elastic',
            task_type: 'sparse_embedding',
            service_settings: {},
            task_settings: {},
          },
        ],
      });
      const service = new RuleMigrationsDataService(logger, kibanaVersion, configuredId);
      await service.setup({ esClient, pluginStop$: new Subject<void>() });
      const installedAdapters = MockedIndexAdapter.mock.instances;
      expect(installedAdapters).toHaveLength(2);
      for (const adapter of installedAdapters) {
        expect(getComponentTemplate(adapter).fieldMap.elser_embedding.inference_id).toBe(
          expectedId
        );
        expect(adapter.install).toHaveBeenCalledTimes(1);
        expect(jest.mocked(adapter.setComponentTemplate).mock.invocationCallOrder[0]).toBeLessThan(
          jest.mocked(adapter.install).mock.invocationCallOrder[0]
        );
      }
      if (configuredId) {
        expect(esClient.inference.get).not.toHaveBeenCalled();
      }
    });

    it('installs local ELSER when discovery fails', async () => {
      esClient.inference.get.mockRejectedValue(new Error('Discovery unavailable'));
      const service = new RuleMigrationsDataService(logger, kibanaVersion);
      await service.setup({ esClient, pluginStop$: new Subject<void>() });
      for (const adapter of MockedIndexAdapter.mock.instances) {
        expect(getComponentTemplate(adapter).fieldMap.elser_embedding.inference_id).toBe(
          defaultInferenceEndpoints.ELSER
        );
        expect(adapter.install).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('createClient', () => {
    it('should install space index pattern', async () => {
      const service = new RuleMigrationsDataService(logger, kibanaVersion);
      const params: SetupParams = {
        esClient,
        pluginStop$: new Subject(),
      };

      await service.setup(params);

      // Adapters only exist once `setup` has resolved
      const [migrationIndexPatternAdapter, rulesIndexPatternAdapter, resourcesIndexPatternAdapter] =
        MockedIndexPatternAdapter.mock.instances;

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
