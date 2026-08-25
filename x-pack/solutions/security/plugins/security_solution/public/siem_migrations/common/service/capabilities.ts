/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import { SIEM_MIGRATIONS_FEATURE_ID } from '@kbn/security-solution-features/constants';
import { i18n } from '@kbn/i18n';
import { CapabilitiesChecker } from '../../../common/lib/capabilities';

export interface MissingCapability {
  capability: string;
  description: string;
}

const minimumSiemMigrationCapabilities: MissingCapability[] = [
  {
    capability: `${SIEM_MIGRATIONS_FEATURE_ID}.all`,
    description: i18n.translate(
      'xpack.securitySolution.siemMigrations.service.capabilities.siemMigrationsAll',
      { defaultMessage: 'Security > Automatic Migration: All' }
    ),
  },
];

const allCapabilities: MissingCapability[] = [
  {
    capability: `${SIEM_MIGRATIONS_FEATURE_ID}.all`,
    description: i18n.translate(
      'xpack.securitySolution.siemMigrations.service.capabilities.siemMigrationsAll',
      { defaultMessage: 'Security > Automatic Migration: All' }
    ),
  },
  {
    capability: 'actions.execute',
    description: i18n.translate(
      'xpack.securitySolution.siemMigrations.service.capabilities.connectorsRead',
      { defaultMessage: 'Management > Actions and Connectors: Read' }
    ),
  },
];

export type CapabilitiesLevel = 'minimum' | 'all';

export type CapabilitiesByLevel = Record<CapabilitiesLevel, MissingCapability[]>;

export const requiredSiemMigrationCapabilities = {
  minimum: minimumSiemMigrationCapabilities,
  all: allCapabilities,
};

export const getMissingCapabilitiesChecker = (
  requiredCapabilities: CapabilitiesByLevel = requiredSiemMigrationCapabilities
) => {
  return (capabilities: Capabilities, level: CapabilitiesLevel = 'all'): MissingCapability[] => {
    const checker = new CapabilitiesChecker(capabilities);
    return requiredCapabilities[level].filter((required) => !checker.has(required.capability));
  };
};
