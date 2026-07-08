/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESOLUTION_RULE_IDS } from '../../../../../../common/domain/resolution_rules/constants';
import { RESOLUTION_RULE_KINDS } from '../../../../../../common/domain/resolution_rules/constants';
import type { RegisterEntityMaintainerConfig } from '../../../../../tasks/entity_maintainers/types';
import { ResolutionClient } from '../../..';
import type { AutomatedResolutionState, PerRuleState } from './types';
import { migrate } from './migrate';
import { RESOLUTION_RULE_CONFIGS } from '../..';
import { runEmailRuleResolution } from './run';
import { runRelatedUserAliasResolution } from '../related_user_alias_resolution';

export const MAINTAINER_ID = 'automated-resolution';

const EMPTY_RULE_STATE: PerRuleState = { lastProcessedTimestamp: null, lastRun: null };

// Initial state for a brand-new task: an empty map. Per-rule state is persisted by
// task-manager between runs (surviving restarts and upgrades); a rule with no
// persisted entry runs a full scan on its first execution, then records its
// watermark for subsequent runs.
const createInitialState = (): AutomatedResolutionState => ({ rules: {} });

export const automatedResolutionMaintainerConfig: RegisterEntityMaintainerConfig = {
  id: MAINTAINER_ID,
  description: 'Automatically resolves entities using field-matching rules',
  interval: '5m',
  initialState: createInitialState(),
  minLicense: 'enterprise',
  run: async ({ status, abortController, logger, esClient, resolutionRulesClient, telemetry }) => {
    const namespace = status.metadata.namespace;
    const state = migrate(status.state, logger);

    const resolutionClient = new ResolutionClient({ logger, esClient, namespace });
    const rules: Record<string, PerRuleState> = { ...state.rules };
    const effectiveRules = new Map(
      (await resolutionRulesClient.getEffectiveRules()).map((rule) => [rule.id, rule])
    );

    for (const ruleConfig of RESOLUTION_RULE_CONFIGS) {
      const effectiveRule = effectiveRules.get(ruleConfig.id);
      if (!effectiveRule?.enabled) {
        logger.debug(`Skipping disabled resolution rule '${ruleConfig.id}'`);
        continue;
      }

      const ruleState = state.rules[ruleConfig.id] ?? EMPTY_RULE_STATE;
      try {
        if (ruleConfig.kind === RESOLUTION_RULE_KINDS.SAME_FIELD) {
          if (ruleConfig.id === RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH) {
            rules[ruleConfig.id] = await runEmailRuleResolution({
              state: ruleState,
              namespace,
              esClient,
              logger,
              resolutionClient,
              abortController,
              telemetry,
            });
          }
        } else if (ruleConfig.kind === RESOLUTION_RULE_KINDS.RELATED_USER_ALIAS_RESOLUTION) {
          rules[ruleConfig.id] = await runRelatedUserAliasResolution({
            state: ruleState,
            namespace,
            esClient,
            logger,
            resolutionClient,
            abortController,
            telemetry,
          });
        }
      } catch (error) {
        logger.warn(`Resolution rule '${ruleConfig.id}' failed: ${error}`);
      }
    }

    return { ...state, rules };
  },
};
