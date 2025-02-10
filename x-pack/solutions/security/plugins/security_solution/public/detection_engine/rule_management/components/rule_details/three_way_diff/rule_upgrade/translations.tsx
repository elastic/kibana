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
    defaultMessage="{countValue} {count, plural, one {field} other {fields}} for review"
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
    defaultMessage="{numOfFieldsWithUpdatesValue} {numOfFieldsWithUpdates, plural, one {field} other {fields}} changed in Elastic update from version {currentVersionNumber} to {targetVersionNumber}"
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
        securitySolution: { manageDetectionRules },
      },
    },
  } = useKibana().services;
  const manageDetectionRulesUpdateRulesSection = `${manageDetectionRules}#edit-rules-settings`;

  return (
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.rules.upgradeRules.ruleUpgradeHelper"
      defaultMessage="Understand how to&nbsp;{docsLink}."
      values={{
        docsLink: (
          <EuiLink href={manageDetectionRulesUpdateRulesSection} target="_blank">
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
    defaultMessage: 'Update status:',
  }
);

export const RULE_HAS_CONFLICTS = (count: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleHasConflicts',
    {
      values: { count },
      defaultMessage:
        '{count} {count, plural, one {field has a conflict} other {fields have conflicts}}. Please review and provide a final update.',
    }
  );

export const RULE_HAS_SOFT_CONFLICTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleHasSoftConflictsDescription',
  {
    defaultMessage:
      'Please review and accept conflicts. You can also keep the current version without the updates, or accept the Elastic update but lose your modifications.',
  }
);

export const RULE_HAS_HARD_CONFLICTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleHasHardConflictsDescription',
  {
    defaultMessage:
      'Please provide an input for the conflicts. You can also keep the current version without the updates, or accept the Elastic update but lose your modifications.',
  }
);

export const RULE_IS_READY_FOR_UPGRADE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.fieldUpgradeState.ruleIsReadyForUpgradeDescription',
  {
    defaultMessage: 'There are no conflicts and the update is ready to be applied.',
  }
);

export const FIELD_MODIFIED_BADGE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeFlyout.fieldModifiedBadgeDescription',
  {
    defaultMessage:
      "The field value was edited after rule's installation and differs from the value upon installation",
  }
);
