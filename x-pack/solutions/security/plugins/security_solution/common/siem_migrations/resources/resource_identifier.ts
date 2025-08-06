/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// TODO: move resource related types to migration.gen.ts
import type {
  RuleMigrationResourceData,
  RuleMigrationResourceBase,
} from '../model/rule_migration.gen';
import type { VendorResourceIdentifier } from './types';
import { splResourceIdentifier } from './splunk';
import type { ItemDocument, SiemMigrationVendor } from '../types';

export const identifiers: Record<SiemMigrationVendor, VendorResourceIdentifier> = {
  splunk: splResourceIdentifier,
};

// Type for a class that extends the ResourceIdentifier abstract class
export type ResourceIdentifierClass<I extends ItemDocument = ItemDocument> = new (
  item: I
) => ResourceIdentifier<I>;

export abstract class ResourceIdentifier<I extends ItemDocument = ItemDocument> {
  protected identifier: VendorResourceIdentifier;

  constructor(protected readonly item: I) {
    this.identifier = identifiers[this.getVendor()];
  }

  protected abstract getVendor(): SiemMigrationVendor;
  public abstract fromOriginal(item?: I): RuleMigrationResourceBase[];

  public fromOriginals(item: I[]): RuleMigrationResourceBase[] {
    const lookups = new Set<string>();
    const macros = new Set<string>();
    item.forEach((rule) => {
      const resources = this.fromOriginal(rule);
      resources.forEach((resource) => {
        if (resource.type === 'macro') {
          macros.add(resource.name);
        } else if (resource.type === 'lookup') {
          lookups.add(resource.name);
        }
      });
    });
    return [
      ...Array.from(macros).map<RuleMigrationResourceBase>((name) => ({ type: 'macro', name })),
      ...Array.from(lookups).map<RuleMigrationResourceBase>((name) => ({ type: 'lookup', name })),
    ];
  }

  public fromResource(resource: RuleMigrationResourceData): RuleMigrationResourceBase[] {
    if (resource.type === 'macro' && resource.content) {
      return this.identifier(resource.content);
    }
    return [];
  }

  public fromResources(resources: RuleMigrationResourceData[]): RuleMigrationResourceBase[] {
    const lookups = new Set<string>();
    const macros = new Set<string>();
    resources.forEach((resource) => {
      this.fromResource(resource).forEach((identifiedResource) => {
        if (identifiedResource.type === 'macro') {
          macros.add(identifiedResource.name);
        } else if (identifiedResource.type === 'lookup') {
          lookups.add(identifiedResource.name);
        }
      });
    });
    return [
      ...Array.from(macros).map<RuleMigrationResourceBase>((name) => ({ type: 'macro', name })),
      ...Array.from(lookups).map<RuleMigrationResourceBase>((name) => ({ type: 'lookup', name })),
    ];
  }
}
