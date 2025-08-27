/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// TODO: move resource related types to migration.gen.ts
import type { SiemMigrationResourceData, SiemMigrationResourceBase } from '../model/common.gen';
import type { VendorResourceIdentifier } from './types';
import { splResourceIdentifier } from './splunk';
import type { ItemDocument, OriginalItem, SiemMigrationVendor } from '../types';

export const identifiers: Record<SiemMigrationVendor, VendorResourceIdentifier> = {
  splunk: splResourceIdentifier,
};

// Type for a class that extends the ResourceIdentifier abstract class
export type ResourceIdentifierConstructor<I extends ItemDocument = ItemDocument> = new (
  vendor: SiemMigrationVendor
) => ResourceIdentifier<I>;

export abstract class ResourceIdentifier<I> {
  protected identifier: VendorResourceIdentifier;

  constructor(protected readonly vendor: SiemMigrationVendor) {
    this.identifier = identifiers[this.vendor];
  }

  public abstract fromOriginal(item?: OriginalItem<I>): SiemMigrationResourceBase[];

  public fromOriginals(item: OriginalItem<I>[]): SiemMigrationResourceBase[] {
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
      ...Array.from(macros).map<SiemMigrationResourceBase>((name) => ({ type: 'macro', name })),
      ...Array.from(lookups).map<SiemMigrationResourceBase>((name) => ({ type: 'lookup', name })),
    ];
  }

  public fromResource(resource: SiemMigrationResourceData): SiemMigrationResourceBase[] {
    if (resource.type === 'macro' && resource.content) {
      return this.identifier(resource.content);
    }
    return [];
  }

  public fromResources(resources: SiemMigrationResourceData[]): SiemMigrationResourceBase[] {
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
      ...Array.from(macros).map<SiemMigrationResourceBase>((name) => ({ type: 'macro', name })),
      ...Array.from(lookups).map<SiemMigrationResourceBase>((name) => ({ type: 'lookup', name })),
    ];
  }
}
