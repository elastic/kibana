/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderPluginSetupDependencies } from '../types';
import { createRcaSkill } from './rca';

export const registerSkills = ({
  plugins,
  logger,
}: {
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}) => {
  plugins.agentBuilder.skills.register(createRcaSkill());
  logger.debug('Successfully registered observability skills in agent-builder');
};
