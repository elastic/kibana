/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ReactNode } from 'react';

export const UPDATE_ALL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.upgradeAll',
  {
    defaultMessage: 'Update all',
  }
);

export const UPDATE_SELECTED_RULES = (numberOfSelectedRules: number) => {
  return i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.upgradeRules.upgradeSelected',
    {
      defaultMessage: 'Update {numberOfSelectedRules} selected rule(s)',
      values: { numberOfSelectedRules },
    }
  );
};

export const BULK_UPDATE_BUTTON_TOOLTIP_NO_PERMISSIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.bulkButtons.noPermissions',
  {
    defaultMessage: "You don't have permissions to update rules",
  }
);

export const BULK_UPDATE_ALL_RULES_BUTTON_TOOLTIP_CONFLICTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.bulkButtons.allRules.conflicts',
  {
    defaultMessage: 'All rules have conflicts. Update them individually.',
  }
);

export const BULK_UPDATE_SELECTED_RULES_BUTTON_TOOLTIP_CONFLICTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.bulkButtons.selectedRules.conflicts',
  {
    defaultMessage: 'All selected rules have conflicts. Update them individually.',
  }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.searchBarPlaceholder',
  {
    defaultMessage: 'Search by rule name',
  }
);

export const UPDATE_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.updateButtonLabel',
  {
    defaultMessage: 'Update',
  }
);

export const UPDATE_FLYOUT_PER_FIELD_TOOLTIP_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.perFieldTooltip',
  {
    defaultMessage: 'View changes field by field.',
  }
);

export const UPDATE_FLYOUT_JSON_VIEW_TOOLTIP_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.jsonViewTooltip',
  {
    defaultMessage: 'View the latest rule changes in JSON format.',
  }
);

export const RULE_TYPE_CHANGE_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeRules.ruleTypeChangeCalloutTitle',
  {
    defaultMessage: 'Rule type change',
  }
);

export const RULE_TYPE_CHANGE_CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeRules.ruleTypeChangeCalloutDescription',
  {
    defaultMessage: 'Elastic update has rule type changed.',
  }
);

export const RULE_TYPE_CHANGE_WITH_CUSTOMIZATIONS_CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeRules.ruleTypeChangeWithCustomizationCalloutDescription',
  {
    defaultMessage:
      'Your customization will be lost at update. Please take note of your customization or clone this rule before updating.',
  }
);

export const LAST_UPDATE = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeFlyout.header.lastUpdate',
  {
    defaultMessage: 'Last update',
  }
);

export const UPDATED_BY_AND_WHEN = (updatedBy: ReactNode, updatedAt: ReactNode) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.upgradeFlyout.header.updated"
    defaultMessage="{updatedBy} on {updatedAt}"
    values={{ updatedBy, updatedAt }}
  />
);

export const SEVERITY = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeFlyout.header.severity',
  {
    defaultMessage: 'Severity',
  }
);

export const FIELD_UPDATES = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeFlyout.header.fieldUpdates',
  {
    defaultMessage: 'Field updates',
  }
);

export const RULE_MODIFIED_BADGE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeFlyout.ruleModifiedBadgeDescription',
  {
    defaultMessage:
      'The rule was edited after installation and field values differs from the values upon installation',
  }
);

export const RULE_NEW_REVISION_DETECTED_WARNING = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeFlyout.ruleNewRevisionDetectedWarning',
  {
    defaultMessage: 'Installed rule changed',
  }
);

export const RULE_NEW_REVISION_DETECTED_WARNING_DESCRIPTION = (ruleName: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.upgradeFlyout.ruleNewVersionDetectedWarningDescription',
    {
      defaultMessage:
        'Someone edited the installed rule "{ruleName}". Upgrade resolved conflicts were reset.',
      values: { ruleName },
    }
  );

export const RULE_NEW_VERSION_DETECTED_WARNING = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeFlyout.ruleNewRevisionDetectedWarning',
  {
    defaultMessage: 'New prebuilt rules package was installed',
  }
);

export const RULE_NEW_VERSION_DETECTED_WARNING_DESCRIPTION = (ruleName: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.upgradeFlyout.ruleNewRevisionDetectedWarningDescription',
    {
      defaultMessage:
        'Newer prebuilt rules package were installed in background. It contains a newer rule version for "{ruleName}". Upgrade resolved conflicts were reset.',
      values: { ruleName },
    }
  );

export const CUSTOMIZATION_DISABLED_CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeRules.customizationDisabledCalloutDescription',
  {
    defaultMessage:
      'Prebuilt rule customization is disabled. Only updates to Elastic version are available.',
  }
);
