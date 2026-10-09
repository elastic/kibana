/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_MANAGEMENT_SKILL_ID } from '@kbn/alerting-v2-constants';
import { buildRuleManagementAgentMessage } from './build_rule_management_agent_message';

describe('buildRuleManagementAgentMessage', () => {
  it('includes the rule-management skill badge and default prompt', () => {
    const message = buildRuleManagementAgentMessage();
    expect(message).toContain(`[/${RULE_MANAGEMENT_SKILL_ID}](skill://${RULE_MANAGEMENT_SKILL_ID})`);
    expect(message).toContain('Help me create a new alerting v2 rule');
  });

  it('appends the user description when provided', () => {
    const message = buildRuleManagementAgentMessage('  CPU above 90%  ');
    expect(message).toContain(`[/${RULE_MANAGEMENT_SKILL_ID}](skill://${RULE_MANAGEMENT_SKILL_ID})`);
    expect(message).toContain('Help me create an alerting rule for: CPU above 90%');
  });
});
