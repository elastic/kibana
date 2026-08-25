/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UPGRADE_INVESTIGATION_GUIDE = (requiredLicense: string) =>
  i18n.translate('securitySolutionPackages.markdown.insight.upsell', {
    defaultMessage: 'Upgrade to {requiredLicense} to make use of insights in investigation guides',
    values: {
      requiredLicense,
    },
  });

export const UPGRADE_INVESTIGATION_GUIDE_INTERACTIONS = (requiredLicense: string) =>
  i18n.translate('securitySolutionPackages.markdown.investigationGuideInteractions.upsell', {
    defaultMessage: 'Upgrade to {requiredLicense} to make use of investigation guide interactions',
    values: {
      requiredLicense,
    },
  });

export const UPGRADE_ALERT_ASSIGNMENTS = (requiredLicense: string) =>
  i18n.translate('securitySolutionPackages.alertAssignments.upsell', {
    defaultMessage: 'Upgrade to {requiredLicense} to make use of alert assignments',
    values: {
      requiredLicense,
    },
  });

export const ALERT_SUPPRESSION_RULE_FORM = (requiredLicense: 'Platinum') =>
  i18n.translate('securitySolutionPackages.alertSuppressionRuleForm.upsell', {
    defaultMessage: 'Alert suppression is enabled with {requiredLicense} license or above',
    values: {
      requiredLicense,
    },
  });

export const ALERT_SUPPRESSION_RULE_DETAILS = i18n.translate(
  'securitySolutionPackages.alertSuppressionRuleDetails.upsell',
  {
    defaultMessage:
      'Alert suppression is configured but will not be applied due to insufficient licensing',
  }
);

export const UPGRADE_NOTES_MANAGEMENT_USER_FILTER = (requiredLicense: string) =>
  i18n.translate('securitySolutionPackages.noteManagement.createdByFilter.upsell', {
    defaultMessage: 'Upgrade to {requiredLicense} to make use of createdBy filter',
    values: {
      requiredLicense,
    },
  });

export const PREBUILT_RULE_CUSTOMIZATION = (requiredLicense: string, licenseKind: string) =>
  i18n.translate('securitySolutionPackages.ruleManagement.prebuiltRuleCustomization.upsell', {
    defaultMessage: '{requiredLicense} {licenseKind} is required to customize prebuilt rules',
    values: {
      requiredLicense,
      licenseKind,
    },
  });

export const PREBUILT_RULE_CUSTOMIZATION_DESCRIPTION = (
  requiredLicense: string,
  licenseKind: string
) =>
  i18n.translate(
    'securitySolutionPackages.ruleManagement.prebuiltRuleCustomization.descriptionUpsell',
    {
      defaultMessage:
        "Without the {requiredLicense} {licenseKind}, prebuilt rules can't be customized. To access this feature, upgrade your {licenseKind} or contact your admin for assistance.",
      values: {
        requiredLicense,
        licenseKind,
      },
    }
  );

export const SIEM_MIGRATION_MANAGER_LICENSE_BTN = i18n.translate(
  'securitySolutionPackages.upselling.siemMigrations.manageLicenseBtn',
  {
    defaultMessage: 'Manage license',
  }
);
