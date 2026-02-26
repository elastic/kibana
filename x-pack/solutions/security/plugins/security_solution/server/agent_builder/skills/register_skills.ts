/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';
import { createAutomaticTroubleshootingSkill } from './automatic_troubleshooting';
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
  };
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
  options,
}: RegisterSkillsOpts): Promise<void> => {
  if (experimentalFeatures.automaticTroubleshootingSkill) {
    agentBuilder.skills.register(
      createAutomaticTroubleshootingSkill(options.endpointAppContextService)
    );
  }

  await agentBuilder.skills.register(
    getEntityAnalyticsSkill({ getStartServices, kibanaVersion, logger })
  );
};
