/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatPluginSetup } from '@kbn/onechat-plugin/server';
import { SECURITY_ALERT_SUPPRESSION_READONLY_SKILL } from './security_alert_suppression_readonly_skill';
import { SECURITY_ATTACK_DISCOVERY_SKILL } from './security_attack_discovery_skill';
import { SECURITY_CASES_SKILL } from './security_cases_skill';
import { SECURITY_DETECTION_RULES_SKILL } from './security_detection_rules_skill';
import { SECURITY_ENDPOINT_RESPONSE_ACTIONS_READONLY_SKILL } from './security_endpoint_response_actions_readonly_skill';
import { SECURITY_ENDPOINT_READONLY_SKILL } from './security_endpoint_readonly_skill';
import { SECURITY_EXCEPTION_LISTS_SKILL } from './security_exception_lists_skill';
import { SECURITY_RULE_EXCEPTIONS_PREVIEW_SKILL } from './security_rule_exceptions_preview_skill';
import { SECURITY_THREAT_INTEL_SKILL } from './security_threat_intel_skill';
import { SECURITY_TIMELINES_SKILL } from './security_timelines_skill';

export const registerAgentBuilderSkills = (onechat: OnechatPluginSetup) => {
  onechat.skills.register(SECURITY_CASES_SKILL);
  onechat.skills.register(SECURITY_DETECTION_RULES_SKILL);
  onechat.skills.register(SECURITY_TIMELINES_SKILL);
  onechat.skills.register(SECURITY_EXCEPTION_LISTS_SKILL);
  onechat.skills.register(SECURITY_ATTACK_DISCOVERY_SKILL);
  onechat.skills.register(SECURITY_ENDPOINT_READONLY_SKILL);
  onechat.skills.register(SECURITY_THREAT_INTEL_SKILL);
  onechat.skills.register(SECURITY_ALERT_SUPPRESSION_READONLY_SKILL);
  onechat.skills.register(SECURITY_RULE_EXCEPTIONS_PREVIEW_SKILL);
  onechat.skills.register(SECURITY_ENDPOINT_RESPONSE_ACTIONS_READONLY_SKILL);
};


