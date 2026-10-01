/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import { RULE_DISPOSITIONS_AI_INDEX_DEST, RULE_DISPOSITIONS_AI_INDEX_ID } from './constants';

/**
 * Registers the rule dispositions AI index with the Context Engine and reports whether it did.
 * The backing index is created from the `ai-index-idx` template on first write.
 */
export const registerRuleDispositionsAiIndex = (
  contextEngine: ContextEnginePluginSetup | undefined,
  logger: Logger
): boolean => {
  if (!contextEngine) {
    logger.debug(
      'contextEngine is not available: Alert Triage closure proposals are not coalesced per rule'
    );
    return false;
  }

  contextEngine.registerAiIndex(RULE_DISPOSITIONS_AI_INDEX_ID, {
    description: i18n.translate('xpack.alertzero.ruleDispositions.aiIndexDescription', {
      defaultMessage:
        'AlertZero rule dispositions: the open false positive closure proposal of each detection rule.',
    }),
    dest: { type: 'index', value: RULE_DISPOSITIONS_AI_INDEX_DEST },
    automations: [],
    sources: [],
    traces: [],
  });
  return true;
};
