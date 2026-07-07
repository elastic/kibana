/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { OriginalRuleVendor } from '../../../common/siem_migrations/model/rule_migration.gen';
import { MigrationSource } from '../common/types';

interface OriginalRuleCopy {
  title: string;
  tooltip: string;
}

interface MissingResourcesCopy {
  readyDescription: string;
  uploadTitle: string;
}

interface CheckResourcesCopy {
  title: string;
  description: string;
}

export interface RuleMigrationVendorCopy {
  originalRule: OriginalRuleCopy;
  missingResources: MissingResourcesCopy;
  checkResources: CheckResourcesCopy;
}

export type RuleMigrationVendor = OriginalRuleVendor | MigrationSource;

export const RULE_MIGRATION_VENDOR_COPY: Record<RuleMigrationVendor, RuleMigrationVendorCopy> = {
  [MigrationSource.SPLUNK]: {
    originalRule: {
      title: i18n.translate(
        'xpack.securitySolution.siemMigrations.rules.vendorCopy.splunk.originalRuleTitle',
        {
          defaultMessage: 'Splunk query',
        }
      ),
      tooltip: i18n.translate(
        'xpack.securitySolution.siemMigrations.rules.vendorCopy.splunk.originalRuleTooltip',
        {
          defaultMessage:
            'This is the rule name detected in the export file uploaded for translation',
        }
      ),
    },
    missingResources: {
      readyDescription: i18n.translate(
        'xpack.securitySolution.siemMigrations.rules.vendorCopy.splunk.missingResourcesReadyDescription',
        {
          defaultMessage:
            'You can also upload the missing macros & lookups for more accurate results.',
        }
      ),
      uploadTitle: i18n.translate(
        'xpack.securitySolution.siemMigrations.rules.vendorCopy.splunk.missingResourcesUploadTitle',
        {
          defaultMessage: 'Upload missing macros and lookup lists.',
        }
      ),
    },
    checkResources: {
      title: i18n.translate(
        'xpack.securitySolution.siemMigrations.rules.vendorCopy.splunk.checkResourcesTitle',
        {
          defaultMessage: 'Check for macros and lookups',
        }
      ),
      description: i18n.translate(
        'xpack.securitySolution.siemMigrations.rules.vendorCopy.splunk.checkResourcesDescription',
        {
          defaultMessage:
            'For best translation results, we will review the data for macros and lookups. If found, we will ask you to upload them next.',
        }
      ),
    },
  },
  [MigrationSource.QRADAR]: {
    originalRule: {
      title: i18n.translate(
        'xpack.securitySolution.siemMigrations.rules.vendorCopy.qradar.originalRuleTitle',
        {
          defaultMessage: 'QRadar rule definition',
        }
      ),
      tooltip: i18n.translate(
        'xpack.securitySolution.siemMigrations.rules.vendorCopy.qradar.originalRuleTooltip',
        {
          defaultMessage:
            'This is the original QRadar rule definition in XML format as exported from QRadar',
        }
      ),
    },
    missingResources: {
      readyDescription: i18n.translate(
        'xpack.securitySolution.siemMigrations.rules.vendorCopy.qradar.missingResourcesReadyDescription',
        {
          defaultMessage:
            'You can also upload the missing reference sets and enhancements for more accurate results.',
        }
      ),
      uploadTitle: i18n.translate(
        'xpack.securitySolution.siemMigrations.rules.vendorCopy.qradar.missingResourcesUploadTitle',
        {
          defaultMessage: 'Upload missing reference sets and rule enhancements',
        }
      ),
    },
    checkResources: {
      title: i18n.translate(
        'xpack.securitySolution.siemMigrations.rules.vendorCopy.qradar.checkResourcesTitle',
        {
          defaultMessage: 'Check for reference sets',
        }
      ),
      description: i18n.translate(
        'xpack.securitySolution.siemMigrations.rules.vendorCopy.qradar.checkResourcesDescription',
        {
          defaultMessage:
            'For best translation results, we will review the data for reference sets. If found, we will ask you to upload them next.',
        }
      ),
    },
  },
  [MigrationSource.SENTINEL]: {
    originalRule: {
      title: i18n.translate(
        'xpack.securitySolution.siemMigrations.rules.vendorCopy.sentinel.originalRuleTitle',
        {
          defaultMessage: 'Microsoft Sentinel rule definition',
        }
      ),
      tooltip: i18n.translate(
        'xpack.securitySolution.siemMigrations.rules.vendorCopy.sentinel.originalRuleTooltip',
        {
          defaultMessage:
            'This is the original Microsoft Sentinel rule definition in ARM template JSON format as exported from Microsoft Sentinel',
        }
      ),
    },
    missingResources: {
      readyDescription: i18n.translate(
        'xpack.securitySolution.siemMigrations.rules.vendorCopy.sentinel.missingResourcesReadyDescription',
        {
          defaultMessage: 'You can also upload the missing watchlists for more accurate results.',
        }
      ),
      uploadTitle: i18n.translate(
        'xpack.securitySolution.siemMigrations.rules.vendorCopy.sentinel.missingResourcesUploadTitle',
        {
          defaultMessage: 'Upload missing watchlists',
        }
      ),
    },
    checkResources: {
      title: i18n.translate(
        'xpack.securitySolution.siemMigrations.rules.vendorCopy.sentinel.checkResourcesTitle',
        {
          defaultMessage: 'Check for watchlists',
        }
      ),
      description: i18n.translate(
        'xpack.securitySolution.siemMigrations.rules.vendorCopy.sentinel.checkResourcesDescription',
        {
          defaultMessage:
            'For best translation results, we will review the data for watchlists. If found, we will ask you to upload them next.',
        }
      ),
    },
  },
};
