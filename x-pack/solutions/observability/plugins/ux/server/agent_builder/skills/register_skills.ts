/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { createRumErrorsSkill } from './rum_errors';
import { createRumFrustrationSkill } from './rum_frustration';
import { createRumReportSkill } from './rum_report';
import { createRumSlowPagesSkill } from './rum_slow_pages';
import { createRumSlowUsersSkill } from './rum_slow_users';

export const registerRumSkills = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.skills.register(createRumSlowUsersSkill());
  agentBuilder.skills.register(createRumSlowPagesSkill());
  agentBuilder.skills.register(createRumErrorsSkill());
  agentBuilder.skills.register(createRumFrustrationSkill());
  agentBuilder.skills.register(createRumReportSkill());
};
