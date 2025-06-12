/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResourceIdentifier } from '../../../../../../common/siem_migrations/rules/resources';
import type {
  RuleMigrationResource,
  RuleMigrationResourceType,
  RuleMigrationRule,
} from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationsDataClient } from '../../data/rule_migrations_data_client';

export interface RuleMigrationDefinedResource extends RuleMigrationResource {
  content: string; // ensures content exists
}
export type RuleMigrationResourcesData = Pick<
  RuleMigrationDefinedResource,
  'name' | 'content' | 'type'
>;
export type RuleMigrationResources = Partial<
  Record<RuleMigrationResourceType, RuleMigrationResourcesData[]>
>;
interface ExistingResources {
  macro: Record<string, RuleMigrationDefinedResource>;
  lookup: Record<string, RuleMigrationDefinedResource>;
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
      { filters: { hasContent: true } } // filters out missing (undefined) content resources, empty strings content will be included
    );

    const existingRuleResources: ExistingResources = { macro: {}, lookup: {} };
    let resources;
    do {
      resources = await batches.next();
      resources.forEach((resource) => {
        existingRuleResources[resource.type][resource.name] = resource;
      });
    } while (resources.length > 0);

    this.existingResources = existingRuleResources;
  }

  public async getResources(migrationRule: RuleMigrationRule): Promise<RuleMigrationResources> {
    const originalRule = migrationRule.original_rule;
    const existingResources = this.existingResources;
    if (!existingResources) {
      throw new Error('initialize must be called before calling getResources');
    }

    const resourceIdentifier = new ResourceIdentifier(originalRule.vendor);
    const resourcesIdentifiedFromRule = resourceIdentifier.fromOriginalRule(originalRule);

    const macrosFound = new Map<string, RuleMigrationDefinedResource>();
    const lookupsFound = new Map<string, RuleMigrationDefinedResource>();
    resourcesIdentifiedFromRule.forEach((resource) => {
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
      const nestedResourcesIdentified = resourceIdentifier.fromResources(nestedResourcesFound);

      nestedResourcesFound = [];
      nestedResourcesIdentified.forEach((resource) => {
        const existingResource = existingResources[resource.type][resource.name];
        if (existingResource) {
          nestedResourcesFound.push(existingResource);
          if (resource.type === 'macro') {
            macrosFound.set(resource.name, existingResource);
          } else if (resource.type === 'lookup') {
            lookupsFound.set(resource.name, existingResource);
          }
        }
      });
    } while (nestedResourcesFound.length > 0);

    return {
      ...(macrosFound.size > 0 ? { macro: this.formatOutput(macrosFound) } : {}),
      ...(lookupsFound.size > 0 ? { lookup: this.formatOutput(lookupsFound) } : {}),
    };
  }

  private formatOutput(
    resources: Map<string, RuleMigrationDefinedResource>
  ): RuleMigrationResourcesData[] {
    return Array.from(resources.values()).map(({ name, content, type }) => ({
      name,
      content,
      type,
    }));
  }
}
