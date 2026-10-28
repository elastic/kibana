/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Capabilities } from '@kbn/core/public';
import { CLASSIC_TO_UNIVERSAL_RULE_MIGRATION_SKILL_ID } from '@kbn/alerting-v2-constants';
import { ES_QUERY_ID } from '@kbn/rule-data-utils';
import type { ClassicRuleMigration } from '@kbn/triggers-actions-ui-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';

export const MIGRATABLE_CLASSIC_RULE_TYPE_IDS: readonly string[] = [ES_QUERY_ID];

/** Prompt that loads the classic-to-universal rule migration skill for a classic rule. */
export const getMigrateClassicRulePrompt = (ruleId: string): string =>
  `[/${CLASSIC_TO_UNIVERSAL_RULE_MIGRATION_SKILL_ID}](skill://${CLASSIC_TO_UNIVERSAL_RULE_MIGRATION_SKILL_ID}) ${i18n.translate(
    'xpack.observabilityAlerting.migrateClassicRule.prompt',
    {
      defaultMessage: 'Migrate the classic rule with id {ruleId} to a universal rule',
      values: { ruleId },
    }
  )}`;

interface UseClassicRuleMigrationParams {
  agentBuilder?: AgentBuilderPluginStart;
  capabilities: Capabilities;
  /** Whether the user can use universal rules, the migration target. */
  canUseUniversalRules: boolean;
}

/** Returns the classic rules page migration, or undefined when Agent Builder chat is unavailable. */
export const useClassicRuleMigration = ({
  agentBuilder,
  capabilities,
  canUseUniversalRules,
}: UseClassicRuleMigrationParams): ClassicRuleMigration | undefined => {
  const [hasChatAccess, setHasChatAccess] = useState(false);
  const canShowAgentBuilder = capabilities.agentBuilder?.show === true;

  useEffect(() => {
    if (!agentBuilder || !canShowAgentBuilder || !canUseUniversalRules) {
      setHasChatAccess(false);
      return;
    }

    let cancelled = false;
    agentBuilder
      .getAgentBuilderAccess()
      .then(({ hasRequiredLicense, hasLlmConnector }) => {
        if (!cancelled) {
          setHasChatAccess(hasRequiredLicense && hasLlmConnector);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasChatAccess(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [agentBuilder, canShowAgentBuilder, canUseUniversalRules]);

  return useMemo(() => {
    if (!agentBuilder || !hasChatAccess) {
      return undefined;
    }

    return {
      ruleTypeIds: MIGRATABLE_CLASSIC_RULE_TYPE_IDS,
      onMigrate: (ruleId: string) => {
        agentBuilder.openChat({
          newConversation: true,
          initialMessage: getMigrateClassicRulePrompt(ruleId),
          autoSendInitialMessage: true,
        });
      },
    };
  }, [agentBuilder, hasChatAccess]);
};
