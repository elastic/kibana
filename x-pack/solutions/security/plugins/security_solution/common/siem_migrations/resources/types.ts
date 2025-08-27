/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// TODO: move resource related types to migration.gen.ts
import type { SiemMigrationResourceBase, SiemMigrationResourceData } from '../model/common.gen';

export type VendorResourceIdentifier = (input: string) => SiemMigrationResourceBase[];

export interface ResourceIdentifiers {
  fromResource: (resource: SiemMigrationResourceData) => SiemMigrationResourceBase[];
}
