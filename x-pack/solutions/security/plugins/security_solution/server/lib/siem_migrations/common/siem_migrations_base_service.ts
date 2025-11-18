/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMap, InstallParams } from '@kbn/index-adapter';
import { IndexAdapter, IndexPatternAdapter } from '@kbn/index-adapter';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { SiemMigrationsIndexNameProvider } from './types';

const TOTAL_FIELDS_LIMIT = 2500;

export interface SetupParams extends Omit<InstallParams, 'logger'> {
  esClient: ElasticsearchClient;
}

interface CreateAdapterParams {
  name: string;
  fieldMap: FieldMap;
}

export abstract class SiemMigrationsBaseDataService {
  protected abstract readonly baseIndexName: string;

  constructor(protected kibanaVersion: string) {}

  protected createIndexPatternAdapter({ name, fieldMap }: CreateAdapterParams) {
    const adapter = new IndexPatternAdapter(name, {
      kibanaVersion: this.kibanaVersion,
      totalFieldsLimit: TOTAL_FIELDS_LIMIT,
    });
    adapter.setComponentTemplate({ name, fieldMap });
    adapter.setIndexTemplate({ name, componentTemplateRefs: [name] });
    return adapter;
  }

  protected createIndexAdapter({ name, fieldMap }: CreateAdapterParams) {
    const adapter = new IndexAdapter(name, {
      kibanaVersion: this.kibanaVersion,
      totalFieldsLimit: TOTAL_FIELDS_LIMIT,
    });
    adapter.setComponentTemplate({ name, fieldMap });
    adapter.setIndexTemplate({ name, componentTemplateRefs: [name] });
    return adapter;
  }

  protected getAdapterIndexName(adapterId: string) {
    return `${this.baseIndexName}-${adapterId}`;
  }

  protected createIndexNameProvider(
    adapter: IndexPatternAdapter,
    spaceId: string
  ): SiemMigrationsIndexNameProvider {
    return async () => {
      await adapter.createIndex(spaceId); // This will resolve instantly when the index is already created
      return adapter.getIndexName(spaceId);
    };
  }
}
