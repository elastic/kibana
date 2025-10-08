/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMap, SchemaFieldMapKeys } from '@kbn/data-stream-adapter';

import type { SiemMigrationResource } from '../../../../../common/siem_migrations/model/common.gen';
import type { MigrationDocument } from '../types';

export const migrationsFieldMaps: FieldMap<
  SchemaFieldMapKeys<Omit<MigrationDocument, 'id' | 'last_execution'>>
> = {
  name: { type: 'keyword', required: true },
  created_at: { type: 'date', required: true },
  created_by: { type: 'keyword', required: true },
};

export const migrationResourcesFieldMap: FieldMap<
  SchemaFieldMapKeys<Omit<SiemMigrationResource, 'id'>>
> = {
  migration_id: { type: 'keyword', required: true },
  type: { type: 'keyword', required: true },
  name: { type: 'keyword', required: true },
  content: { type: 'text', required: false },
  metadata: { type: 'object', required: false },
  updated_at: { type: 'date', required: false },
  updated_by: { type: 'keyword', required: false },
};
