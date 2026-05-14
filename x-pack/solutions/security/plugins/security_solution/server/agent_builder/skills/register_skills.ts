/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';
import type { ConfigType } from '../../config';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import type { DetectionEmulationGuardrails } from '../../lib/detection_emulation/execution/shared_guardrails';
import { createAutomaticTroubleshootingSkill } from './automatic_troubleshooting';
import { getDetectionRuleEditSkill } from './detection_rule_edit';
import { getEntityAnalyticsSkill } from './entity_analytics';
import { pciComplianceSkill } from './pci_compliance';
import { threatHuntingSkill } from './threat_hunting';
import { alertAnalysisSkill } from './alert_analysis';
import type { EntityAnalyticsRoutesDeps } from '../../lib/entity_analytics/types';
import { findSecurityMlJobsSkill } from './find_security_ml_jobs';
import { siemReadinessSkill } from './siem_readiness';
import { getDetectionEmulationSkill } from './detection_emulation';

interface RegisterSkillsOpts {
  agentBuilder: AgentBuilderPluginSetup;
  experimentalFeatures: ExperimentalFeatures;
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  kibanaVersion: string;
  logger: Logger;
  ml: EntityAnalyticsRoutesDeps['ml'];
  options: {
    endpointAppContextService: EndpointAppContextService;
  };
  core: SecuritySolutionPluginCoreSetupDependencies;
  config: ConfigType;
  /**
   * Shared guardrail bundle from `plugin.ts`, threaded into the
   * detection-emulation skill so its inline tools share the same
   * allowlist + rate-limit + concurrency state as the REST routes.
   */
  detectionEmulationGuardrails: DetectionEmulationGuardrails;
}

/**
 * Registers all security agent builder skills with the agentBuilder plugin
 */
export const registerSkills = async ({
  agentBuilder,
  experimentalFeatures,
  getStartServices,
  kibanaVersion,
  logger,
  ml,
  options,
  core,
  config,
  detectionEmulationGuardrails,
}: RegisterSkillsOpts): Promise<void> => {
  if (experimentalFeatures.automaticTroubleshootingSkill) {
    agentBuilder.skills.register(
      createAutomaticTroubleshootingSkill(options.endpointAppContextService)
    );
  }

  const isEntityStoreV2Enabled = experimentalFeatures.entityAnalyticsEntityStoreV2;
  await agentBuilder.skills.register(
    getEntityAnalyticsSkill({ getStartServices, isEntityStoreV2Enabled, kibanaVersion, logger })
  );

  agentBuilder.skills.register(getDetectionRuleEditSkill());
  await agentBuilder.skills.register(
    findSecurityMlJobsSkill({ getStartServices, isEntityStoreV2Enabled, logger, ml })
  );

  await agentBuilder.skills.register(threatHuntingSkill);
  await agentBuilder.skills.register(alertAnalysisSkill);
  await agentBuilder.skills.register(siemReadinessSkill);

  if (experimentalFeatures.pciComplianceAgentBuilder) {
    agentBuilder.skills.register(pciComplianceSkill);
  }

  // Register the detection-emulation skill when EITHER feature flag is on,
  // so the safe `log_injection` mode (gated by `detectionEmulationLogInjection`)
  // remains available without forcing operators to additionally enable
  // `detectionEmulationRealExecution`. The two modes have independent
  // gates inside the tools — the OR here only governs whether the skill
  // surfaces in the catalog at all.
  if (
    experimentalFeatures.detectionEmulationLogInjection ||
    experimentalFeatures.detectionEmulationRealExecution
  ) {
    agentBuilder.skills.register(
      getDetectionEmulationSkill({
        core,
        endpointService: options.endpointAppContextService,
        config,
        logger,
        guardrails: detectionEmulationGuardrails,
      })
    );
  }
};
