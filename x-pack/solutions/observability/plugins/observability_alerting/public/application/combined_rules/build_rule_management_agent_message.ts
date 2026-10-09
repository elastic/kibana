/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_MANAGEMENT_SKILL_ID } from '@kbn/alerting-v2-constants';

/** Builds an Agent Builder initial message that loads the rule-management skill. */
export const buildRuleManagementAgentMessage = (userInput?: string): string => {
  const skillBadge = `[/${RULE_MANAGEMENT_SKILL_ID}](skill://${RULE_MANAGEMENT_SKILL_ID})`;
  const trimmed = userInput?.trim();
  if (trimmed) {
    return `${skillBadge} Help me create an alerting rule for: ${trimmed}`;
  }
  return `${skillBadge} Help me create a new alerting v2 rule. Ask me what I want to monitor and guide me through the setup.`;
};
