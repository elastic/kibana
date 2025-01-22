/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AuthenticatedUser, IScopedClusterClient, Logger } from '@kbn/core/server';
import {
  IndexAdapter,
  IndexPatternAdapter,
  type FieldMap,
  type InstallParams,
} from '@kbn/index-adapter';
import type { IndexNameProvider, IndexNameProviders } from './rule_migrations_data_client';
import { RuleMigrationsDataClient } from './rule_migrations_data_client';
import type { SiemRuleMigrationsClientDependencies } from '../types';
import {
  integrationsFieldMap,
  prebuiltRulesFieldMap,
  ruleMigrationResourcesFieldMap,
  ruleMigrationsFieldMap,
} from './rule_migrations_field_maps';

const TOTAL_FIELDS_LIMIT = 2500;
export const INDEX_PATTERN = '.kibana-siem-rule-migrations';

export interface Adapters {
  rules: IndexPatternAdapter;
  resources: IndexPatternAdapter;
  integrations: IndexAdapter;
  prebuiltrules: IndexAdapter;
}

export type AdapterId = keyof Adapters;

interface CreateClientParams {
  spaceId: string;
  currentUser: AuthenticatedUser;
  esScopedClient: IScopedClusterClient;
  dependencies: SiemRuleMigrationsClientDependencies;
}
interface CreateAdapterParams {
  adapterId: AdapterId;
  fieldMap: FieldMap;
}

export class RuleMigrationsDataService {
  private readonly adapters: Adapters;

  constructor(private logger: Logger, private kibanaVersion: string) {
    this.adapters = {
      rules: this.createIndexPatternAdapter({
        adapterId: 'rules',
        fieldMap: ruleMigrationsFieldMap,
      }),
      resources: this.createIndexPatternAdapter({
        adapterId: 'resources',
        fieldMap: ruleMigrationResourcesFieldMap,
      }),
      integrations: this.createIndexAdapter({
        adapterId: 'integrations',
        fieldMap: integrationsFieldMap,
      }),
      prebuiltrules: this.createIndexAdapter({
        adapterId: 'prebuiltrules',
        fieldMap: prebuiltRulesFieldMap,
      }),
    };
  }

  private getAdapterIndexName(adapterId: AdapterId) {
    return `${INDEX_PATTERN}-${adapterId}`;
  }

  private createIndexPatternAdapter({ adapterId, fieldMap }: CreateAdapterParams) {
    const name = this.getAdapterIndexName(adapterId);
    const adapter = new IndexPatternAdapter(name, {
      kibanaVersion: this.kibanaVersion,
      totalFieldsLimit: TOTAL_FIELDS_LIMIT,
    });
    adapter.setComponentTemplate({ name, fieldMap });
    adapter.setIndexTemplate({ name, componentTemplateRefs: [name] });
    return adapter;
  }

  private createIndexAdapter({ adapterId, fieldMap }: CreateAdapterParams) {
    const name = this.getAdapterIndexName(adapterId);
    const adapter = new IndexAdapter(name, {
      kibanaVersion: this.kibanaVersion,
      totalFieldsLimit: TOTAL_FIELDS_LIMIT,
    });
    adapter.setComponentTemplate({ name, fieldMap });
    adapter.setIndexTemplate({ name, componentTemplateRefs: [name] });
    return adapter;
  }

  public async install(params: Omit<InstallParams, 'logger'>): Promise<void> {
    await Promise.all([
      this.adapters.rules.install({ ...params, logger: this.logger }),
      this.adapters.resources.install({ ...params, logger: this.logger }),
      this.adapters.integrations.install({ ...params, logger: this.logger }),
      this.adapters.prebuiltrules.install({ ...params, logger: this.logger }),
    ]);
  }

  public createClient({ spaceId, currentUser, esScopedClient, dependencies }: CreateClientParams) {
    const indexNameProviders: IndexNameProviders = {
      rules: this.createIndexNameProvider(this.adapters.rules, spaceId),
      resources: this.createIndexNameProvider(this.adapters.resources, spaceId),
      integrations: async () => this.getAdapterIndexName('integrations'),
      prebuiltrules: async () => this.getAdapterIndexName('prebuiltrules'),
    };

    return new RuleMigrationsDataClient(
      indexNameProviders,
      currentUser,
      esScopedClient,
      this.logger,
      dependencies
    );
  }

  private createIndexNameProvider(
    adapter: IndexPatternAdapter,
    spaceId: string
  ): IndexNameProvider {
    return async () => {
      await adapter.createIndex(spaceId); // This will resolve instantly when the index is already created
      return adapter.getIndexName(spaceId);
    };
  }
}
