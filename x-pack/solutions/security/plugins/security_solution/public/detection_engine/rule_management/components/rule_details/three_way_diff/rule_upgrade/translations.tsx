/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../../../common/lib/kibana/kibana_react';

export const TOTAL_NUM_OF_FIELDS = (count: number) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.rules.upgradeRules.diffTab.totalNumOfFieldsWithUpdates"
    defaultMessage="{countValue} {count, plural, one {field} other {fields}} {count, plural, one {requires} other {require}} review"
    values={{ countValue: <strong>{count}</strong>, count }}
  />
);

export const VERSION_UPDATE_INFO = (
  numOfFieldsWithUpdates: number,
  currentVersionNumber: number,
  targetVersionNumber: number
) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.rules.upgradeRules.diffTab.versionUpdateInfo"
    defaultMessage="{numOfFieldsWithUpdatesValue} {numOfFieldsWithUpdates, plural, one {field} other {fields}} being changed in this Elastic update from version {currentVersionNumber} to {targetVersionNumber}"
    values={{
      numOfFieldsWithUpdatesValue: <strong>{numOfFieldsWithUpdates}</strong>,
      numOfFieldsWithUpdates,
      currentVersionNumber,
      targetVersionNumber,
    }}
  />
);

export const NUM_OF_CONFLICTS = (count: number) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.rules.upgradeRules.diffTab.numOfConflicts"
    defaultMessage="{countValue} {count, plural, one {conflict} other {conflicts}}"
    values={{ countValue: <strong>{count}</strong>, count }}
  />
);

const UPGRADE_RULES_DOCS_LINK = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.updateYourRulesDocsLink',
  {
    defaultMessage: 'update your rules',
  }
);

export function RuleUpgradeHelper(): JSX.Element {
  const {
    docLinks: {
      links: {
        securitySolution: { updatePrebuiltDetectionRules },
      },
    },
  } = useKibana().services;

  return (
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.rules.upgradeRules.ruleUpgradeHelper"
      defaultMessage="Understand how to&nbsp;{docsLink}."
      values={{
        docsLink: (
          <EuiLink href={updatePrebuiltDetectionRules} target="_blank">
            {UPGRADE_RULES_DOCS_LINK}
          </EuiLink>
        ),
      }}
    />
  );
}

export const UPGRADE_STATUS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.upgradeStatusTitle',
  {
    defaultMessage: 'Status:',
  }
);

export const RULE_HAS_CONFLICTS = (count: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleHasConflicts',
    {
      values: { count },
      defaultMessage:
        '{count} {count, plural, one {field has a conflict} other {fields have conflicts}}. Review and provide a final update.',
    }
  );

export const RULE_HAS_SOFT_CONFLICTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleHasSoftConflictsDescription',
  {
    defaultMessage:
      'We auto-resolved the conflicts between your changes and the Elastic update. Review them and do one of the following:',
  }
);

export const RULE_HAS_SOFT_CONFLICTS_ACCEPT_SUGGESTED_UPDATE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleHasSoftConflictsAcceptSuggestedUpdate',
  {
    defaultMessage: 'Accept the suggested update.',
  }
);

export const RULE_HAS_SOFT_CONFLICTS_EDIT_FINAL_VERSION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleHasSoftConflictsEditFinalVersion',
  {
    defaultMessage: 'Edit the final version and choose a more appropriate field value.',
  }
);

export const RULE_HAS_HARD_CONFLICTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleHasHardConflictsDescription',
  {
    defaultMessage:
      "We couldn't auto-resolve the conflicts between your changes and the Elastic update. To resolve them, do one of the following:",
  }
);

export const RULE_HAS_HARD_CONFLICTS_KEEP_YOUR_CHANGES = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleHasHardConflictsKeepYourChanges',
  {
    defaultMessage: 'Keep your changes and reject the Elastic update.',
  }
);

export const RULE_HAS_HARD_CONFLICTS_ACCEPT_ELASTIC_UPDATE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleHasHardConflictsAcceptElasticUpdate',
  {
    defaultMessage: 'Accept the Elastic update and overwrite your changes.',
  }
);

export const RULE_HAS_HARD_CONFLICTS_EDIT_FINAL_VERSION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleHasHardConflictsEditFinalVersion',
  {
    defaultMessage:
      'Edit the final version by combining your changes with the Elastic update or choosing a more appropriate field value.',
  }
);

export const RULE_IS_READY_FOR_UPGRADE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleIsReadyForUpgradeDescription',
  {
    defaultMessage: 'There are no conflicts. The rule is ready to be updated.',
  }
);

export const FIELD_MODIFIED_BADGE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeFlyout.fieldModifiedBadgeDescription',
  {
    defaultMessage:
      'This field value differs from the one provided in the original version of the rule.',
  }
);

export const RULE_BASE_VERSION_IS_MISSING_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeFlyout.baseVersionMissingDescription',
  {
    defaultMessage:
      "The original, unedited version of this Elastic rule couldn't be found. This sometimes happens when a rule hasn't been updated in a while. You can still update this rule, but will only have access to its current version and the incoming Elastic update. Updating Elastic rules more often can help you avoid this in the future. We encourage you to review this update carefully and ensure your changes are not accidentally overwritten.",
  }
);
