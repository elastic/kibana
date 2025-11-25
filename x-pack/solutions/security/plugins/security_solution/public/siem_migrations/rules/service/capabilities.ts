/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  RULES_UI_READ_PRIVILEGE,
  SIEM_MIGRATIONS_FEATURE_ID,
} from '@kbn/security-solution-features/constants';
import {
  requiredSiemMigrationCapabilities,
  type CapabilitiesLevel,
  type MissingCapability,
} from '../../common/service/capabilities';

const allRuleMigrationCapabilities: MissingCapability[] = [
  {
    capability: RULES_UI_READ_PRIVILEGE,
    description: i18n.translate(
      'xpack.securitySolution.siemMigrations.service.capabilities.rulesRead',
      { defaultMessage: 'Security > Rules: Read' }
    ),
  },
];

const minimumRuleMigrationCapabilities: MissingCapability[] = [
  {
    capability: `${SIEM_MIGRATIONS_FEATURE_ID}.all`,
    description: i18n.translate(
      'xpack.securitySolution.siemMigrations.service.capabilities.siemMigrationsAll',
      { defaultMessage: 'Security > SIEM migrations: All' }
    ),
  },
];

export const requiredRuleMigrationCapabilities: Record<CapabilitiesLevel, MissingCapability[]> = {
  minimum: [...requiredSiemMigrationCapabilities.minimum, ...minimumRuleMigrationCapabilities],
  all: [...requiredSiemMigrationCapabilities.all, ...allRuleMigrationCapabilities],
};
