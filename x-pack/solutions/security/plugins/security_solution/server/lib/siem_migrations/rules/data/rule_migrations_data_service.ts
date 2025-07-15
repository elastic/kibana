/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  AuthenticatedUser,
  ElasticsearchClient,
  IScopedClusterClient,
  Logger,
} from '@kbn/core/server';
import { type FieldMap, type InstallParams } from '@kbn/index-adapter';
import type {} from './rule_migrations_data_client';
import { RuleMigrationsDataClient } from './rule_migrations_data_client';
import type {
  RuleMigrationAdapterId,
  RuleMigrationAdapters,
  RuleMigrationIndexNameProviders,
} from '../types';
import {
  getIntegrationsFieldMap,
  getPrebuiltRulesFieldMap,
  migrationsFieldMaps,
  ruleMigrationResourcesFieldMap,
  ruleMigrationsFieldMap,
} from './rule_migrations_field_maps';
import { RuleMigrationIndexMigrator } from '../index_migrators';
import { SiemMigrationsBaseDataService } from '../../common/siem_migrations_base_service';
import type { SiemMigrationsClientDependencies } from '../../common/types';

export const INDEX_PATTERN = '.kibana-siem-rule-migrations';

interface CreateClientParams {
  spaceId: string;
  currentUser: AuthenticatedUser;
  esScopedClient: IScopedClusterClient;
  dependencies: SiemMigrationsClientDependencies;
}
interface CreateRuleAdapterParams {
  adapterId: RuleMigrationAdapterId;
  fieldMap: FieldMap;
}

export interface SetupParams extends Omit<InstallParams, 'logger'> {
  esClient: ElasticsearchClient;
}

export class RuleMigrationsDataService extends SiemMigrationsBaseDataService {
  private readonly adapters: RuleMigrationAdapters;

  constructor(private logger: Logger, protected kibanaVersion: string, elserInferenceId?: string) {
    super(kibanaVersion);
    this.adapters = {
      migrations: this.createRuleIndexPatternAdapter({
        adapterId: 'migrations',
        fieldMap: migrationsFieldMaps,
      }),
      rules: this.createRuleIndexPatternAdapter({
        adapterId: 'rules',
        fieldMap: ruleMigrationsFieldMap,
      }),
      resources: this.createRuleIndexPatternAdapter({
        adapterId: 'resources',
        fieldMap: ruleMigrationResourcesFieldMap,
      }),
      integrations: this.createRuleIndexAdapter({
        adapterId: 'integrations',
        fieldMap: getIntegrationsFieldMap({ elserInferenceId }),
      }),
      prebuiltrules: this.createRuleIndexAdapter({
        adapterId: 'prebuiltrules',
        fieldMap: getPrebuiltRulesFieldMap({ elserInferenceId }),
      }),
    };
  }

  private getAdapterIndexName(adapterId: RuleMigrationAdapterId) {
    return `${INDEX_PATTERN}-${adapterId}`;
  }

  private createRuleIndexPatternAdapter({ adapterId, fieldMap }: CreateRuleAdapterParams) {
    const name = this.getAdapterIndexName(adapterId);
    return this.createIndexPatternAdapter({ name, fieldMap });
  }

  private createRuleIndexAdapter({ adapterId, fieldMap }: CreateRuleAdapterParams) {
    const name = this.getAdapterIndexName(adapterId);
    return this.createIndexAdapter({ name, fieldMap });
  }

  private async runIndexMigrations(esClient: SetupParams['esClient']) {
    const indexMigrator = new RuleMigrationIndexMigrator(this.adapters, esClient, this.logger);
    await indexMigrator.run();
  }

  private async install(params: SetupParams): Promise<void> {
    await Promise.all([
      this.adapters.rules.install({ ...params, logger: this.logger }),
      this.adapters.resources.install({ ...params, logger: this.logger }),
      this.adapters.integrations.install({ ...params, logger: this.logger }),
      this.adapters.prebuiltrules.install({ ...params, logger: this.logger }),
      this.adapters.migrations.install({ ...params, logger: this.logger }),
    ]);
  }

  public async setup(params: SetupParams): Promise<void> {
    await this.install(params);
    await this.runIndexMigrations(params.esClient);
  }

  public createClient({ spaceId, currentUser, esScopedClient, dependencies }: CreateClientParams) {
    const indexNameProviders: RuleMigrationIndexNameProviders = {
      rules: this.createIndexNameProvider(this.adapters.rules, spaceId),
      resources: this.createIndexNameProvider(this.adapters.resources, spaceId),
      integrations: async () => this.getAdapterIndexName('integrations'),
      prebuiltrules: async () => this.getAdapterIndexName('prebuiltrules'),
      migrations: this.createIndexNameProvider(this.adapters.migrations, spaceId),
    };

    return new RuleMigrationsDataClient(
      indexNameProviders,
      currentUser,
      esScopedClient,
      this.logger,
      spaceId,
      dependencies
    );
  }
}
