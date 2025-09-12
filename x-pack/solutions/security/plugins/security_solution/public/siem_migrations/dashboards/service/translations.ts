/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EMPTY_DASHBOARDS_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboardsService.create.emptyDashbaordsError',
  { defaultMessage: 'Can not create a migration without dashboards' }
);

export const UPDATE_DASHBOARD_MIGRATION_SUCCESS = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboardsService.update.success',
  { defaultMessage: 'Dashboard migration updated' }
);

export const UPDATE_DASHBOARD_MIGRATION_FAILURE = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboardsService.update.failure',
  { defaultMessage: 'Error updating dashboard migration' }
);
