/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '../../tasks/entity_maintainers/types';
import type { EntityStoreCoreSetup } from '../../types';
import { ResolutionRuleOverridesClient } from '../../domain/saved_objects/resolution_rule_overrides';
import { migrateAutomatedResolutionState } from './state_migration';
import { runRules } from './run';
import { OOTB_RESOLUTION_RULES, STAGE_0_RULE_IDS } from './rules_config';
import type { AutomatedResolutionState } from './types';

const MAINTAINER_ID = 'automated-resolution';

function createInitialState(): AutomatedResolutionState {
  return {
    rules: STAGE_0_RULE_IDS.reduce((acc, id) => {
      acc[id] = { lastProcessedTimestamp: null, lastRun: null };
      return acc;
    }, {} as AutomatedResolutionState['rules']),
  };
}

/**
 * Factory that creates the `automatedResolutionMaintainerConfig`.
 *
 * Accepts `coreSetup` so the `run()` callback can obtain a scoped saved-objects
 * client from `fakeRequest` (needed to read per-rule enable/disable overrides).
 * `getStartServices()` resolves immediately after plugin setup completes —
 * no async penalty inside the hot task-runner path.
 */
export function createAutomatedResolutionMaintainerConfig(
  coreSetup: EntityStoreCoreSetup
): RegisterEntityMaintainerConfig {
  return {
    id: MAINTAINER_ID,
    description: 'Automatically resolves entities using field-matching rules',
    interval: '5m',
    initialState: createInitialState(),
    minLicense: 'enterprise',
    run: async ({ status, abortController, logger, esClient, fakeRequest }) => {
      const [coreStart] = await coreSetup.getStartServices();
      const soClient = coreStart.savedObjects.getScopedClient(fakeRequest);

      const namespace = status.metadata.namespace;
      const state = migrateAutomatedResolutionState(status.state, logger);
      const overridesClient = new ResolutionRuleOverridesClient(soClient, namespace, logger);

      const overrides = await overridesClient.getOverrides().catch((err: Error) => {
        logger.warn(
          `Failed to read rule overrides, defaulting to all rules enabled: ${err.message}`
        );
        return {} as Record<string, boolean>;
      });

      const enabledRules = OOTB_RESOLUTION_RULES.filter((rule) => overrides[rule.id] !== false);

      if (enabledRules.length === 0) {
        logger.debug('All resolution rules are disabled, skipping run');
        return state;
      }

      return runRules({
        state,
        enabledRules,
        namespace,
        esClient,
        logger,
        abortController,
      });
    },
  };
}
