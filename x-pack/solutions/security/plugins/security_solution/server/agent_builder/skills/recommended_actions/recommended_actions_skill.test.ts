/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import { SECURITY_GET_ENTITY_TOOL_ID, SECURITY_SEARCH_ENTITIES_TOOL_ID } from '../../tools';
import { RECOMMENDED_ACTIONS_SKILL_ID, recommendedActionsSkill } from '.';

describe('recommendedActionsSkill', () => {
  it('is a valid allow-listed built-in skill', async () => {
    expect(isAllowedBuiltinSkill(RECOMMENDED_ACTIONS_SKILL_ID)).toBe(true);
    await expect(validateSkillDefinition(recommendedActionsSkill)).resolves.toBeDefined();
  });

  it('exposes only read-only entity and ES|QL tools', () => {
    expect(recommendedActionsSkill.getRegistryTools?.()).toEqual([
      SECURITY_GET_ENTITY_TOOL_ID,
      SECURITY_SEARCH_ENTITIES_TOOL_ID,
      platformCoreTools.listIndices,
      platformCoreTools.getIndexMapping,
      platformCoreTools.generateEsql,
      platformCoreTools.executeEsql,
    ]);
    expect(recommendedActionsSkill.getRegistryTools?.()).not.toContain(platformCoreTools.cases);
  });

  it('defines the complete classified action catalog and recommend-only guardrail', () => {
    for (const actionType of [
      'isolate_host',
      'kill_process',
      'hunt_process_persistence',
      'create_case',
      'set_asset_criticality',
      'analyze_exfiltration_ips',
      'revoke_user_account',
      'enforce_step_up_auth',
      'onboard_integration',
    ]) {
      expect(recommendedActionsSkill.content).toContain(`\`${actionType}\``);
    }

    expect(recommendedActionsSkill.content).toContain('execution: "kibana_api"');
    expect(recommendedActionsSkill.content).toContain('execution: "manual"');
    expect(recommendedActionsSkill.content).toContain('MUST NOT execute');
    expect(recommendedActionsSkill.content).toContain('recommended_actions');
  });
});
