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

  public fromQuery(query: string): RuleMigrationResourceBase[] {
    return this.identifier(query);
  }

  public abstract fromOriginal(
    item?: OriginalItem<I>
  ): RuleMigrationResourceBase[] | Promise<RuleMigrationResourceBase[]>;

  public async fromOriginals(item: OriginalItem<I>[]): Promise<RuleMigrationResourceBase[]> {
    const lookups = new Set<string>();
    const macros = new Set<string>();
    for (const originalItem of item) {
      const resources = await this.fromOriginal(originalItem);
      resources.forEach((resource) => {
        if (resource.type === 'macro') {
          macros.add(resource.name);
        } else if (resource.type === 'lookup') {
          lookups.add(resource.name);
        }
      });
    }
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
