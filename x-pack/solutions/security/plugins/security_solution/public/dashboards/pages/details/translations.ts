/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DASHBOARD_NO_READ_PERMISSION_TITLE = i18n.translate(
  'xpack.securitySolution.dashboards.dashboard.viewPorpmpt.noReadPermission.title',
  {
    defaultMessage: 'You have no permission to read the dashboard',
  }
);

export const DASHBOARD_NO_READ_PERMISSION_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.dashboards.dashboard.viewPorpmpt.noReadPermission.description',
  {
    defaultMessage: 'Contact your administrator for help.',
  }
);

export const EDIT_DASHBOARD_TITLE = i18n.translate(
  'xpack.securitySolution.dashboards.dashboard.editDashboardTitle',
  {
    defaultMessage: `Editing new dashboard`,
  }
);
