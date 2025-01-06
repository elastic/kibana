/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionPluginRouter } from '../../../../types';

// eslint-disable-next-line no-restricted-imports
import { legacyCreateLegacyNotificationRoute } from './create_legacy_notification/route';

export const registerLegacyRuleActionsRoutes = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  // Once we no longer have the legacy notifications system/"side car actions" this should be removed.
  legacyCreateLegacyNotificationRoute(router, logger);
};
