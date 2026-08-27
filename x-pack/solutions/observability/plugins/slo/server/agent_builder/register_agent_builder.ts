/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { GetScopedClients } from '../lib/get_scoped_clients';
import type {
  SLOPluginSetupDependencies,
  SLOPluginStartDependencies,
  SLOServerStart,
} from '../types';
import type { SloToolDeps } from './common/deps';
import { createSloManagementSkill } from './skills/slo_management_skill';

export const registerAgentBuilder = ({
  core,
  plugins,
  getScopedClients,
  config,
  logger,
}: {
  core: CoreSetup<SLOPluginStartDependencies, SLOServerStart>;
  plugins: SLOPluginSetupDependencies;
  getScopedClients: GetScopedClients;
  config: { isServerless: boolean; getIsCpsEnabled: () => boolean };
  logger: Logger;
}): void => {
  if (!plugins.agentBuilder) {
    return;
  }

  const { agentBuilder } = plugins;

  const deps: SloToolDeps = {
    getScopedClients,
    getLicensing: () =>
      core.getStartServices().then(([, pluginsStart]) => pluginsStart.licensing),
    config,
    logger,
  };

  try {
    agentBuilder.skills.register(createSloManagementSkill(deps));
  } catch (error) {
    logger.error(`Failed to register SLO agent builder skill: ${error}`);
  }
};
