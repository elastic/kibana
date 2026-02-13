/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import {
  FORENSICS_ANALYTICS_SKILL,
  GET_ALERTS_SKILL,
  SECURITY_LABS_SEARCH_SKILL,
} from '../../assistant/skills';
import { SECURITY_ALERT_SUPPRESSION_READONLY_SKILL } from './security_alert_suppression_readonly_skill';
import { SECURITY_ATTACK_DISCOVERY_SKILL } from './security_attack_discovery_skill';
import { SECURITY_CASES_SKILL } from './security_cases_skill';
import { SECURITY_DETECTION_RULES_SKILL } from './security_detection_rules_skill';
import { SECURITY_ENDPOINT_RESPONSE_ACTIONS_READONLY_SKILL } from './security_endpoint_response_actions_readonly_skill';
import { SECURITY_ENDPOINT_READONLY_SKILL } from './security_endpoint_readonly_skill';
import { SECURITY_EXCEPTION_LISTS_SKILL } from './security_exception_lists_skill';
import { SECURITY_NETWORK_SKILL } from './security_network_skill';
import { SECURITY_RULE_EXCEPTIONS_PREVIEW_SKILL } from './security_rule_exceptions_preview_skill';
import { SECURITY_THREAT_INTEL_SKILL } from './security_threat_intel_skill';
import { SECURITY_TIMELINES_SKILL } from './security_timelines_skill';

/**
 * Registers all security agent builder skills with the agentBuilder plugin
 * using the new SkillDefinition-based registration API.
 */
export const registerSkills = async (agentBuilder: AgentBuilderPluginSetup): Promise<void> => {
  await Promise.all([
    agentBuilder.skill.registerSkill(GET_ALERTS_SKILL),
    agentBuilder.skill.registerSkill(FORENSICS_ANALYTICS_SKILL),
    agentBuilder.skill.registerSkill(SECURITY_LABS_SEARCH_SKILL),
    agentBuilder.skill.registerSkill(SECURITY_CASES_SKILL),
    agentBuilder.skill.registerSkill(SECURITY_DETECTION_RULES_SKILL),
    agentBuilder.skill.registerSkill(SECURITY_TIMELINES_SKILL),
    agentBuilder.skill.registerSkill(SECURITY_EXCEPTION_LISTS_SKILL),
    agentBuilder.skill.registerSkill(SECURITY_ATTACK_DISCOVERY_SKILL),
    agentBuilder.skill.registerSkill(SECURITY_ENDPOINT_READONLY_SKILL),
    agentBuilder.skill.registerSkill(SECURITY_NETWORK_SKILL),
    agentBuilder.skill.registerSkill(SECURITY_THREAT_INTEL_SKILL),
    agentBuilder.skill.registerSkill(SECURITY_ALERT_SUPPRESSION_READONLY_SKILL),
    agentBuilder.skill.registerSkill(SECURITY_RULE_EXCEPTIONS_PREVIEW_SKILL),
    agentBuilder.skill.registerSkill(SECURITY_ENDPOINT_RESPONSE_ACTIONS_READONLY_SKILL),
  ]);
};
