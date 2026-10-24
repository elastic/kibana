/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import { RESOLUTION_RULE_IDS } from '@kbn/entity-store/common';
import {
  SECURITY_LIST_RESOLUTION_RULES_TOOL_ID,
  SECURITY_SET_RESOLUTION_RULES_TOOL_ID,
} from '../../tools';
import { entityResolutionSkill } from './entity_resolution_skill';

/**
 * The resolution-rule vocabulary is the routing contract for this skill.
 *
 * Skill selection is decided from `- <id>: <name> — <description>` alone (see
 * `selectRelevantSkills`), so a request like "Disable the Windows SID bridge resolution rule"
 * only reaches this skill if the description names the resolution-rule domain. When it does not,
 * the agent picks the detection-rules skill, searches `security.find_rules`, and answers that no
 * such rule exists — the failure these assertions pin.
 *
 * The assertions below fail on the pre-fix description/body (no named managed rules, no
 * `security.set_resolution_rules` mapping, no "not a detection rule" boundary).
 */
describe('entity-resolution skill resolution-rule routing contract', () => {
  const description = entityResolutionSkill.description;
  const content = entityResolutionSkill.content;

  it('validates as a skill definition', async () => {
    await expect(validateSkillDefinition(entityResolutionSkill)).resolves.toBeDefined();
  });

  it('keeps the description within the 1024 character limit', () => {
    expect(description.length).toBeLessThanOrEqual(1024);
  });

  it('names the resolution-rule domain in the description the selector reads', () => {
    expect(description).toMatch(/resolution rule/i);
    expect(description).toMatch(/set_resolution_rules/);
  });

  it('pins every managed resolution rule id in the description', () => {
    for (const ruleId of Object.values(RESOLUTION_RULE_IDS)) {
      expect(description).toContain(ruleId);
    }
  });

  it('states in the description that resolution rules are not detection rules', () => {
    expect(description).toMatch(/resolution rules are NOT detection rules/i);
    expect(description).toMatch(/find-security-rules/);
    expect(description).toMatch(/security\.find_rules/);
  });

  it('carries the resolution-rule vocabulary in the skill body', () => {
    expect(content).toMatch(/## Resolution rules are not detection rules/);
    expect(content).toMatch(/<name> resolution rule/);
    expect(content).toMatch(/windows_sid_bridge/);
    expect(content).toMatch(/email_exact_match/);
  });

  it('pins every managed resolution rule id in the body table', () => {
    for (const ruleId of Object.values(RESOLUTION_RULE_IDS)) {
      expect(content).toContain(`| \`${ruleId}\` |`);
    }
  });

  it('routes the toggle to set_resolution_rules and away from the detection-rules tools', () => {
    expect(content).toMatch(
      /Enabling or disabling one of these is `security\.set_resolution_rules`/
    );
    expect(content).toMatch(/find-security-rules skill or `security\.find_rules`/);
    expect(content).toMatch(/return nothing for a resolution rule/);
  });

  it('forbids the "no matching rule was found" reply for a resolution rule', () => {
    expect(content).toMatch(/reply that no matching rule was found/);
    expect(content).toMatch(/answer from `security\.list_resolution_rules`/);
  });

  it('keeps the resolution-rule tools on the skill', () => {
    const tools = entityResolutionSkill.getRegistryTools!();
    expect(tools).toContain(SECURITY_LIST_RESOLUTION_RULES_TOOL_ID);
    expect(tools).toContain(SECURITY_SET_RESOLUTION_RULES_TOOL_ID);
  });
});
