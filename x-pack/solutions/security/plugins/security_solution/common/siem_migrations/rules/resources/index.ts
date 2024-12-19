/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  OriginalRule,
  OriginalRuleVendor,
  RuleMigrationResourceData,
  RuleMigrationResourceBase,
} from '../../model/rule_migration.gen';
import type { ResourceIdentifiers } from './types';
import { splResourceIdentifiers } from './splunk';

const ruleResourceIdentifiers: Record<OriginalRuleVendor, ResourceIdentifiers> = {
  splunk: splResourceIdentifiers,
};

export const getRuleResourceIdentifier = (vendor: OriginalRuleVendor): ResourceIdentifiers => {
  return ruleResourceIdentifiers[vendor];
};

export class ResourceIdentifier {
  private identifiers: ResourceIdentifiers;

  constructor(vendor: OriginalRuleVendor) {
    // The constructor may need query_language as an argument for other vendors
    this.identifiers = ruleResourceIdentifiers[vendor];
  }

  public fromOriginalRule(originalRule: OriginalRule): RuleMigrationResourceBase[] {
    return this.identifiers.fromOriginalRule(originalRule);
  }

  public fromResource(resource: RuleMigrationResourceData): RuleMigrationResourceBase[] {
    return this.identifiers.fromResource(resource);
  }

  public fromOriginalRules(originalRules: OriginalRule[]): RuleMigrationResourceBase[] {
    const lookups = new Set<string>();
    const macros = new Set<string>();
    originalRules.forEach((rule) => {
      const resources = this.identifiers.fromOriginalRule(rule);
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

  public fromResources(resources: RuleMigrationResourceData[]): RuleMigrationResourceBase[] {
    const lookups = new Set<string>();
    const macros = new Set<string>();
    resources.forEach((resource) => {
      this.identifiers.fromResource(resource).forEach((identifiedResource) => {
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
