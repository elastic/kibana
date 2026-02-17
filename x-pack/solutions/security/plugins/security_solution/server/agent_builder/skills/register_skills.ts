/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { getEntityAnalysisSkill } from './entity_analysis';
import type { EntityAnalyticsRoutesDeps } from '../../lib/entity_analytics/types';

interface RegisterSkillsOpts {
  agentBuilder: AgentBuilderPluginSetup;
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  kibanaVersion: string;
  logger: Logger;
}

/**
 * Registers all security agent builder skills with the agentBuilder plugin
 */
export const registerSkills = async ({
  agentBuilder,
  getStartServices,
  kibanaVersion,
  logger,
}: RegisterSkillsOpts): Promise<void> => {
  await agentBuilder.skills.register(
    getEntityAnalysisSkill({ getStartServices, kibanaVersion, logger })
  );
  // await agentBuilder.skills.register(alertAnalysisSampleSkill);
};
