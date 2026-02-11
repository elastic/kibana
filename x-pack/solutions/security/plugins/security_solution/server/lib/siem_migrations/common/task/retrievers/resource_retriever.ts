/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Simplify } from 'type-fest';
import {
  isResourceSupportedVendor,
  type ResourceSupportedVendor,
} from '../../../../../../common/siem_migrations/rules/resources/types';
import type {
  ResourceIdentifierConstructor,
  SiemMigrationResourceTypeByVendor,
} from '../../../../../../common/siem_migrations/resources';
import type { OriginalItem } from '../../../../../../common/siem_migrations/types';
import type { SiemMigrationResource } from '../../../../../../common/siem_migrations/model/common.gen';
import type { ItemDocument } from '../../types';
import type { ResourceRetrieverDeps } from './types';

type SupportedSiemMigrationResourceType =
  SiemMigrationResourceTypeByVendor[ResourceSupportedVendor];

type SupportedVendorSiemMigrationResource = Simplify<
  SiemMigrationResource & {
    type: SupportedSiemMigrationResourceType;
  }
>;

export interface MigrationDefinedResource extends SupportedVendorSiemMigrationResource {
  content: string; // ensures content exists
}
export type MigrationResourcesData = Pick<MigrationDefinedResource, 'name' | 'content' | 'type'>;
export type MigrationResources = Partial<
  Record<SupportedSiemMigrationResourceType, MigrationResourcesData[]>
>;
interface ExistingResources {
  macro: Record<string, MigrationDefinedResource>;
  lookup: Record<string, MigrationDefinedResource>;
}

export abstract class ResourceRetriever<I extends ItemDocument = ItemDocument> {
  private existingResources?: ExistingResources;

  constructor(
    protected readonly migrationId: string,
    protected readonly ResourceIdentifier: ResourceIdentifierConstructor<I>,
    protected readonly deps: ResourceRetrieverDeps
  ) {}

  public async initialize(): Promise<void> {
    const batches = this.deps.resourcesDataClient.searchBatches<MigrationDefinedResource>(
      this.migrationId,
      { filters: { hasContent: true } } // filters out missing (undefined) content resources, empty strings content will be included
    );

    const existingResources: ExistingResources = { macro: {}, lookup: {} };
    let resources;
    do {
      resources = await batches.next();
      resources.forEach((resource) => {
        // currenctly only supported for splunk
        if (resource.type === 'macro' || resource.type === 'lookup') {
          existingResources[resource.type][resource.name] = resource;
        }
      });
    } while (resources.length > 0);

    this.existingResources = existingResources;
  }

  public async getResources(originalItem: OriginalItem<I>): Promise<MigrationResources> {
    if (!isResourceSupportedVendor(originalItem.vendor)) {
      throw new Error(`Resource retrievel is not supported for vendor: ${originalItem.vendor}`);
    }
    const existingResources = this.existingResources;
    if (!existingResources) {
      throw new Error('initialize must be called before calling getResources');
    }

    const resourceIdentifier = new this.ResourceIdentifier(originalItem.vendor, {
      experimentalFeatures: this.deps.experimentalFeatures,
    });
    const resourcesIdentifiedFromRule = await resourceIdentifier.fromOriginal(originalItem);

    const macrosFound = new Map<string, MigrationDefinedResource>();
    const lookupsFound = new Map<string, MigrationDefinedResource>();
    resourcesIdentifiedFromRule.forEach((resource) => {
      if (resource.type !== 'macro' && resource.type !== 'lookup') {
        return;
      }
      const existingResource = existingResources[resource.type][resource.name];
      if (existingResource) {
        if (resource.type === 'macro') {
          macrosFound.set(resource.name, existingResource);
        } else if (resource.type === 'lookup') {
          lookupsFound.set(resource.name, existingResource);
        }
      }
    });

    const resourcesFound = [...macrosFound.values(), ...lookupsFound.values()];
    if (!resourcesFound.length) {
      return {};
    }

    let nestedResourcesFound = resourcesFound;
    do {
      const nestedResourcesIdentified = await resourceIdentifier.fromResources(
        nestedResourcesFound
      );
      const nextNestedResources: MigrationDefinedResource[] = [];

      nestedResourcesIdentified.forEach((resource, index) => {
        if (resource.type !== 'macro' && resource.type !== 'lookup') {
          return;
        }
        const existingResource = existingResources[resource.type][resource.name];
        if (existingResource) {
          nextNestedResources.push(existingResource);
          if (resource.type === 'macro') {
            macrosFound.set(resource.name, existingResource);
          } else if (resource.type === 'lookup') {
            lookupsFound.set(resource.name, existingResource);
          }
        }
      });
      nestedResourcesFound = nextNestedResources;
    } while (nestedResourcesFound.length > 0);

    return {
      ...(macrosFound.size > 0 ? { macro: this.formatOutput(macrosFound) } : {}),
      ...(lookupsFound.size > 0 ? { lookup: this.formatOutput(lookupsFound) } : {}),
    };
  }

  private formatOutput(resources: Map<string, MigrationDefinedResource>): MigrationResourcesData[] {
    return Array.from(resources.values()).map(({ name, content, type }) => ({
      name,
      content,
      type,
    }));
  }
}
