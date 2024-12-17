/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResourceIdentifier } from '../../../../../../common/siem_migrations/rules/resources';
import type {
  OriginalRule,
  RuleMigrationResource,
  RuleMigrationResourceType,
} from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationsDataClient } from '../../data/rule_migrations_data_client';

export interface RuleMigrationDefinedResource extends RuleMigrationResource {
  content: string; // ensures content exists
}
export type RuleMigrationResources = Partial<
  Record<RuleMigrationResourceType, RuleMigrationDefinedResource[]>
>;
interface ExistingResources {
  macro: Record<string, RuleMigrationDefinedResource>;
  list: Record<string, RuleMigrationDefinedResource>;
}

export class RuleResourceRetriever {
  private existingResources?: ExistingResources;

  constructor(
    private readonly migrationId: string,
    private readonly dataClient: RuleMigrationsDataClient
  ) {}

  public async initialize(): Promise<void> {
    const batches = this.dataClient.resources.searchBatches<RuleMigrationDefinedResource>(
      this.migrationId,
      { filters: { hasContent: true } }
    );

    const existingRuleResources: ExistingResources = { macro: {}, list: {} };
    let resources;
    do {
      resources = await batches.next();
      resources.forEach((resource) => {
        existingRuleResources[resource.type][resource.name] = resource;
      });
    } while (resources.length > 0);

    this.existingResources = existingRuleResources;
  }

  public async getResources(originalRule: OriginalRule): Promise<RuleMigrationResources> {
    const existingResources = this.existingResources;
    if (!existingResources) {
      throw new Error('initialize must be called before calling getResources');
    }

    const resourceIdentifier = new ResourceIdentifier(originalRule.vendor);
    const resourcesIdentifiedFromRule = resourceIdentifier.fromOriginalRule(originalRule);

    const macrosFound = new Map<string, RuleMigrationDefinedResource>();
    const listsFound = new Map<string, RuleMigrationDefinedResource>();
    resourcesIdentifiedFromRule.forEach((resource) => {
      const existingResource = existingResources[resource.type][resource.name];
      if (existingResource) {
        if (resource.type === 'macro') {
          macrosFound.set(resource.name, existingResource);
        } else if (resource.type === 'list') {
          listsFound.set(resource.name, existingResource);
        }
      }
    });

    const resourcesFound = [...macrosFound.values(), ...listsFound.values()];
    if (!resourcesFound.length) {
      return {};
    }

    let nestedResourcesFound = resourcesFound;
    do {
      const nestedResourcesIdentified = resourceIdentifier.fromResources(nestedResourcesFound);

      nestedResourcesFound = [];
      nestedResourcesIdentified.forEach((resource) => {
        const existingResource = existingResources[resource.type][resource.name];
        if (existingResource) {
          nestedResourcesFound.push(existingResource);
          if (resource.type === 'macro') {
            macrosFound.set(resource.name, existingResource);
          } else if (resource.type === 'list') {
            listsFound.set(resource.name, existingResource);
          }
        }
      });
    } while (nestedResourcesFound.length > 0);

    return {
      ...(macrosFound.size > 0 ? { macro: Array.from(macrosFound.values()) } : {}),
      ...(listsFound.size > 0 ? { list: Array.from(listsFound.values()) } : {}),
    };
  }
}
