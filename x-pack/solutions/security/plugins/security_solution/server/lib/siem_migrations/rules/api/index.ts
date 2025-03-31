/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { registerSiemRuleMigrationsCreateRoute } from './create';
import { registerSiemRuleMigrationsUpdateRoute } from './update';
import { registerSiemRuleMigrationsGetRoute } from './get';
import { registerSiemRuleMigrationsStartRoute } from './start';
import { registerSiemRuleMigrationsStatsRoute } from './stats';
import { registerSiemRuleMigrationsTranslationStatsRoute } from './translation_stats';
import { registerSiemRuleMigrationsStopRoute } from './stop';
import { registerSiemRuleMigrationsStatsAllRoute } from './stats_all';
import { registerSiemRuleMigrationsResourceUpsertRoute } from './resources/upsert';
import { registerSiemRuleMigrationsResourceGetRoute } from './resources/get';
import { registerSiemRuleMigrationsInstallRoute } from './install';
import { registerSiemRuleMigrationsResourceGetMissingRoute } from './resources/missing';
import { registerSiemRuleMigrationsPrebuiltRulesRoute } from './get_prebuilt_rules';
import { registerSiemRuleMigrationsIntegrationsRoute } from './get_integrations';
import { registerSiemRuleMigrationsGetMissingPrivilegesRoute } from './privileges/get_missing_privileges';

export const registerSiemRuleMigrationsRoutes = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  registerSiemRuleMigrationsCreateRoute(router, logger);
  registerSiemRuleMigrationsUpdateRoute(router, logger);
  registerSiemRuleMigrationsStatsAllRoute(router, logger);
  registerSiemRuleMigrationsPrebuiltRulesRoute(router, logger);
  registerSiemRuleMigrationsGetRoute(router, logger);
  registerSiemRuleMigrationsStartRoute(router, logger);
  registerSiemRuleMigrationsStatsRoute(router, logger);
  registerSiemRuleMigrationsTranslationStatsRoute(router, logger);
  registerSiemRuleMigrationsStopRoute(router, logger);
  registerSiemRuleMigrationsInstallRoute(router, logger);
  registerSiemRuleMigrationsIntegrationsRoute(router, logger);

  registerSiemRuleMigrationsResourceUpsertRoute(router, logger);
  registerSiemRuleMigrationsResourceGetRoute(router, logger);
  registerSiemRuleMigrationsResourceGetMissingRoute(router, logger);

  registerSiemRuleMigrationsGetMissingPrivilegesRoute(router, logger);
};
