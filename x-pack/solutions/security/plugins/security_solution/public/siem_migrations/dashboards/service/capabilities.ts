/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  requiredSiemMigrationCapabilities,
  type CapabilitiesLevel,
  type MissingCapability,
} from '../../common/service/capabilities';

const dashboardCapability = {
  capability: `dashboard_v2.all`,
  description: i18n.translate(
    'xpack.securitySolution.siemMigrations.service.capabilities.dashboardsAll',
    { defaultMessage: 'Analytics > Dashboards: All' }
  ),
};

export const requiredDashboardMigrationCapabilities: Record<
  CapabilitiesLevel,
  MissingCapability[]
> = {
  minimum: requiredSiemMigrationCapabilities.minimum,
  all: [...requiredSiemMigrationCapabilities.all, dashboardCapability],
};
