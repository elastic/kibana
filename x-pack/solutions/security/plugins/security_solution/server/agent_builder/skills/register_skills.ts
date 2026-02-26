/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { OsqueryPluginSetup } from '@kbn/osquery-plugin/server';
import {
  FORENSICS_ANALYTICS_SKILL,
  GET_ALERTS_SKILL,
  SECURITY_LABS_SEARCH_SKILL,
} from '../../assistant/skills';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';
import { createAutomaticTroubleshootingSkill } from './automatic_troubleshooting';
import { SECURITY_ALERT_SUPPRESSION_READONLY_SKILL } from './security_alert_suppression_readonly_skill';
import { SECURITY_ATTACK_DISCOVERY_SKILL } from './security_attack_discovery_skill';
import { SECURITY_CASES_SKILL } from './security_cases_skill';
import { SECURITY_DETECTION_RULES_SKILL } from './security_detection_rules_skill';
import { SECURITY_ENDPOINT_RESPONSE_ACTIONS_READONLY_SKILL } from './security_endpoint_response_actions_readonly_skill';
import { SECURITY_ENDPOINT_READONLY_SKILL } from './security_endpoint_readonly_skill';
import { SECURITY_EXCEPTION_LISTS_SKILL } from './security_exception_lists_skill';
import { SECURITY_NETWORK_SKILL } from './security_network_skill';
import { createSecurityOsquerySkill } from './security_osquery_skill';
import { SECURITY_RULE_EXCEPTIONS_PREVIEW_SKILL } from './security_rule_exceptions_preview_skill';
import { SECURITY_THREAT_INTEL_SKILL } from './security_threat_intel_skill';
import { SECURITY_TIMELINES_SKILL } from './security_timelines_skill';
import { getEntityAnalyticsSkill } from './entity_analytics';
import type { EntityAnalyticsRoutesDeps } from '../../lib/entity_analytics/types';

interface RegisterSkillsOpts {
  agentBuilder: AgentBuilderPluginSetup;
  experimentalFeatures: ExperimentalFeatures;
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  kibanaVersion: string;
  logger: Logger;
  options: {
    endpointAppContextService: EndpointAppContextService;
    osquerySetup?: OsqueryPluginSetup;
  };
}

/**
 * Registers all security agent builder skills with the agentBuilder plugin
 * using the new SkillDefinition-based registration API.
 */
export const registerSkills = async ({
  agentBuilder,
  experimentalFeatures,
  getStartServices,
  kibanaVersion,
  logger,
  options,
}: RegisterSkillsOpts): Promise<void> => {
  const osquerySkill = createSecurityOsquerySkill({
    endpointAppContextService: options.endpointAppContextService,
    osquerySetup: options.osquerySetup,
  });

  await Promise.all([
    agentBuilder.skills.register(GET_ALERTS_SKILL),
    agentBuilder.skills.register(FORENSICS_ANALYTICS_SKILL),
    agentBuilder.skills.register(SECURITY_LABS_SEARCH_SKILL),
    agentBuilder.skills.register(SECURITY_CASES_SKILL),
    agentBuilder.skills.register(SECURITY_DETECTION_RULES_SKILL),
    agentBuilder.skills.register(SECURITY_TIMELINES_SKILL),
    agentBuilder.skills.register(SECURITY_EXCEPTION_LISTS_SKILL),
    agentBuilder.skills.register(SECURITY_ATTACK_DISCOVERY_SKILL),
    agentBuilder.skills.register(SECURITY_ENDPOINT_READONLY_SKILL),
    agentBuilder.skills.register(SECURITY_NETWORK_SKILL),
    agentBuilder.skills.register(osquerySkill),
    agentBuilder.skills.register(SECURITY_THREAT_INTEL_SKILL),
    agentBuilder.skills.register(SECURITY_ALERT_SUPPRESSION_READONLY_SKILL),
    agentBuilder.skills.register(SECURITY_RULE_EXCEPTIONS_PREVIEW_SKILL),
    agentBuilder.skills.register(SECURITY_ENDPOINT_RESPONSE_ACTIONS_READONLY_SKILL),
  ]);
  if (experimentalFeatures.automaticTroubleshootingSkill) {
    agentBuilder.skills.register(
      createAutomaticTroubleshootingSkill(options.endpointAppContextService)
    );
  }

  await agentBuilder.skills.register(
    getEntityAnalyticsSkill({ getStartServices, kibanaVersion, logger })
  );
};
