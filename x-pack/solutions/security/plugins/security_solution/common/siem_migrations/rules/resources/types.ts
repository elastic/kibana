/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SiemMigrationResourceBase,
  SiemMigrationResourceData,
  SiemMigrationVendor,
} from '../../model/common.gen';

import type { OriginalRule } from '../../model/rule_migration.gen';

export type VendorResourceIdentifier = (
  input: string
) => SiemMigrationResourceBase[] | Promise<SiemMigrationResourceBase[]>;

export interface ResourceIdentifiers {
  fromOriginalRule: (originalRule: OriginalRule) => SiemMigrationResourceBase[];
  fromResource: (resource: SiemMigrationResourceData) => SiemMigrationResourceBase[];
}

const RESOURCE_IDENT_SUPPORTED_VENDORS = ['splunk', 'qradar'] as const;

export type ResourceSupportedVendor = (typeof RESOURCE_IDENT_SUPPORTED_VENDORS)[number];

export const isResourceSupportedVendor = (
  vendor: SiemMigrationVendor
): vendor is ResourceSupportedVendor => {
  return RESOURCE_IDENT_SUPPORTED_VENDORS.includes(vendor as ResourceSupportedVendor);
};
