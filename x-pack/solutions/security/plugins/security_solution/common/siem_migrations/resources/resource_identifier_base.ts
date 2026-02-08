/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemMigrationResourceBase, SiemMigrationResourceData } from '../model/common.gen';
import { splResourceIdentifier } from './splunk';
import {
  isResourceSupportedVendor,
  type ResourceSupportedVendor,
  type VendorResourceIdentifier,
} from '../rules/resources/types';
import type { ItemDocument, OriginalItem } from '../types';
import type { SplunkResourceType } from '../model/vendor/common/splunk.gen';
import type { QradarResourceType } from '../model/vendor/common/qradar.gen';
import { qradarResourceIdentifier } from './qradar';
import type { ExperimentalFeatures } from '../../experimental_features';

export interface SiemMigrationResourceTypeByVendor {
  splunk: SplunkResourceType;
  qradar: QradarResourceType;
}

export interface ResourceIdentifierDeps {
  experimentalFeatures: ExperimentalFeatures;
}

/** Currently resource identification is only needed for Splunk since this for Qradar we identify resources by LLM */
const identifiers: Record<ResourceSupportedVendor, VendorResourceIdentifier> = {
  splunk: splResourceIdentifier,
  qradar: qradarResourceIdentifier,
};

// Type for a class that extends the ResourceIdentifier abstract class
export type ResourceIdentifierConstructor<I extends ItemDocument = ItemDocument> = new (
  vendor: ResourceSupportedVendor,
  deps: ResourceIdentifierDeps
) => ResourceIdentifier<I>;

export abstract class ResourceIdentifier<I> {
  public abstract fromOriginal(item?: OriginalItem<I>): Promise<SiemMigrationResourceBase[]>;

  protected identifier: VendorResourceIdentifier;

  constructor(
    protected readonly vendor: ResourceSupportedVendor,
    protected readonly deps: ResourceIdentifierDeps
  ) {
    // The constructor may need query_language as an argument for other vendors
    if (!isResourceSupportedVendor(this.vendor)) {
      throw new Error(`Resource identification is not supported for vendor: ${this.vendor}`);
    }
    this.identifier = identifiers[this.vendor];
  }

  public fromQuery(
    query: string
  ): SiemMigrationResourceBase[] | Promise<SiemMigrationResourceBase[]> {
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

  public async fromResource(
    resource: SiemMigrationResourceData
  ): Promise<SiemMigrationResourceBase[]> {
    if (resource.type === 'macro' && resource.content && this.vendor === 'splunk') {
      return this.identifier(resource.content);
    }
    return Promise.resolve([]);
  }

  public async fromResources(
    resources: SiemMigrationResourceData[]
  ): Promise<SiemMigrationResourceBase[]> {
    if (this.vendor !== 'splunk') {
      return [];
    }
    const lookups = new Set<string>();
    const macros = new Set<string>();
    for (const resource of resources) {
      const resourcesFromResource = await this.fromResource(resource);
      resourcesFromResource.forEach((identifiedResource) => {
        if (identifiedResource.type === 'macro') {
          macros.add(identifiedResource.name);
        } else if (identifiedResource.type === 'lookup') {
          lookups.add(identifiedResource.name);
        }
      });
    }
    return [
      ...Array.from(macros).map<SiemMigrationResourceBase>((name) => ({ type: 'macro', name })),
      ...Array.from(lookups).map<SiemMigrationResourceBase>((name) => ({ type: 'lookup', name })),
    ];
  }
}
