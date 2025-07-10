/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UPGRADE_LICENSE_MESSAGE = (requiredLicense: string) =>
  i18n.translate('xpack.securitySolutionEss.upselling.upgradeLicenseMessage', {
    defaultMessage: 'This feature is available with {requiredLicense} or higher subscription',
    values: {
      requiredLicense,
    },
  });

export const SIEM_MIGRATION_UPSELLING_TITLE = (requiredLicense: string) =>
  i18n.translate('xpack.securitySolutionEss.upselling.siemMigrations.title', {
    defaultMessage: '{requiredLicense} license required',
    values: {
      requiredLicense,
    },
  });

export const SIEM_MIGRATION_UPGRADE_LICENSE_MESSAGE = i18n.translate(
  'xpack.securitySolutionEss.upselling.siemMigrations.upgradeLicenseMessage',
  {
    defaultMessage: 'To use this feature, upgrade your Elastic subscription level.',
  }
);

export const SIEM_MIGRATION_RULES_PAGE_UPGRADE_LICENSE_MESSAGE = i18n.translate(
  'xpack.securitySolutionEss.upselling.siemMigrations.rulesPageUpgradeLicenseMessage',
  {
    defaultMessage:
      'To use this feature, upgrade your Elastic subscription level. If you have created a migration previously, you will be able to access it after upgrade.',
  }
);
