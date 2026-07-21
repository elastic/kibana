/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ExperimentalFeatures } from '../../../../../../common';
import type { RuleMigrationsDataClient } from '../../data/rule_migrations_data_client';
import { IntegrationRetriever } from './integration_retriever';
import { PrebuiltRulesRetriever } from './prebuilt_rules_retriever';
import { RuleResourceRetriever } from './rule_resource_retriever';
import { getElserErrorMessage } from './get_elser_error_message';

export interface RuleMigrationsRetrieverDeps {
  data: RuleMigrationsDataClient;
  rules: RulesClient;
  savedObjects: SavedObjectsClientContract;
  experimentalFeatures: ExperimentalFeatures;
}

/** The timeout to populate ELSER indices in minutes */
const POPULATE_ELSER_INDICES_TIMEOUT_MIN = 20 as const;

/**
 * RuleMigrationsRetriever is a class that is responsible for retrieving all the necessary data during the rule migration process.
 * It is composed of multiple retrievers that are responsible for retrieving specific types of data.
 * Such as rule integrations, prebuilt rules, and rule resources.
 */
export class RuleMigrationsRetriever {
  private static populatePromise: Promise<void> | null = null;
  public readonly resources: RuleResourceRetriever;
  public readonly integrations: IntegrationRetriever;
  public readonly prebuiltRules: PrebuiltRulesRetriever;

  constructor(migrationId: string, deps: RuleMigrationsRetrieverDeps) {
    this.resources = new RuleResourceRetriever(migrationId, {
      experimentalFeatures: deps.experimentalFeatures,
      resourcesDataClient: deps.data.resources,
    });
    this.integrations = new IntegrationRetriever(deps);
    this.prebuiltRules = new PrebuiltRulesRetriever(deps);
  }

  private async populateElserIndices() {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.all([this.prebuiltRules.populateIndex(), this.integrations.populateIndex()]),
        new Promise((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error(`Timeout (${POPULATE_ELSER_INDICES_TIMEOUT_MIN}m)`)),
            POPULATE_ELSER_INDICES_TIMEOUT_MIN * 60 * 1000
          );
        }),
      ]);
    } catch (err) {
      const elserMessage = getElserErrorMessage(err);
      if (elserMessage) {
        throw new Error(elserMessage);
      }
      throw err;
    } finally {
      // Clear the timeout timer so it does not keep the event loop alive once the
      // populate has settled (either resolved or rejected).
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  public async initialize() {
    // Run only one populateIndices promise at a time, if one is already running, wait for it to finish
    if (RuleMigrationsRetriever.populatePromise === null) {
      RuleMigrationsRetriever.populatePromise = this.populateElserIndices().finally(() => {
        RuleMigrationsRetriever.populatePromise = null;
      });
    }
    await Promise.all([RuleMigrationsRetriever.populatePromise, this.resources.initialize()]);
  }
}
