/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemMigrationResourceBase, SiemMigrationResourceData } from '../model/common.gen';
import { splResourceIdentifier } from './splunk';
import type { VendorResourceIdentifier } from '../rules/resources/types';
import type { ItemDocument, OriginalItem, SiemMigrationVendor } from '../types';

const identifiers: Record<SiemMigrationVendor, VendorResourceIdentifier> = {
  splunk: splResourceIdentifier,
};

// Type for a class that extends the ResourceIdentifier abstract class
export type ResourceIdentifierConstructor<I extends ItemDocument = ItemDocument> = new (
  vendor: SiemMigrationVendor
) => ResourceIdentifier<I>;

export abstract class ResourceIdentifier<I> {
  public abstract fromOriginal(item?: OriginalItem<I>): Promise<SiemMigrationResourceBase[]>;

  protected identifier: VendorResourceIdentifier;

  constructor(protected readonly vendor: SiemMigrationVendor) {
    // The constructor may need query_language as an argument for other vendors
    this.identifier = identifiers[this.vendor];
  }

  public fromQuery(query: string): SiemMigrationResourceBase[] {
    return this.identifier(query);
  }

  public async fromOriginals(
    originalItem: OriginalItem<I>[]
  ): Promise<SiemMigrationResourceBase[]> {
    const lookups = new Set<string>();
    const macros = new Set<string>();
    for (const item of originalItem) {
      const resources = await this.fromOriginal(item);
      resources.forEach((resource) => {
        if (resource.type === 'macro') {
          macros.add(resource.name);
        } else if (resource.type === 'lookup') {
          lookups.add(resource.name);
        }
      });
    }
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
