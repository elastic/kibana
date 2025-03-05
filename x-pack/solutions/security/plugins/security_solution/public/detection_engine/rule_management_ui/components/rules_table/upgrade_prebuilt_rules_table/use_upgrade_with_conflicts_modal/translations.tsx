/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const UPGRADE_CONFLICTS_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeConflictsModal.messageTitle',
  {
    defaultMessage: 'There are rules with conflicts',
  }
);

export const UPGRADE_CONFLICTS_MODAL_CANCEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeConflictsModal.cancelTitle',
  {
    defaultMessage: 'Cancel',
  }
);

export const UPGRADE_RULES_WITHOUT_CONFLICTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeConflictsModal.upgradeRulesWithoutConflicts',
  {
    defaultMessage: 'Update rules',
  }
);

export const UPGRADE_RULES_WITH_CONFLICTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeConflictsModal.upgradeRulesWithConflicts',
  {
    defaultMessage: 'Update rules with conflicts',
  }
);

export const ONLY_RULES_WITH_SOLVABLE_CONFLICTS = (numOfRules: number) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.upgradeConflictsModal.onlySolvableConflicts"
    defaultMessage="All {numOfRules} selected rules to update have auto-resolved conflicts. You may proceed and update them without reviewing but this operation is potentially dangerous and may result in broken rules."
    values={{ numOfRules: <strong>{numOfRules}</strong> }}
  />
);

export const ONLY_RULES_WITH_NON_SOLVABLE_CONFLICTS = (numOfRules: number) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.upgradeConflictsModal.onlyNonSolvableConflicts"
    defaultMessage="All {numOfRules} selected rules to update have unresolved conflicts. Please review and update them individually via the flyout."
    values={{ numOfRules: <strong>{numOfRules}</strong> }}
  />
);

export const RULES_WITHOUT_CONFLICTS_AND_RULES_WITH_NON_SOLVABLE_CONFLICTS = ({
  numOfRulesWithoutConflicts,
  numOfRulesWithNonSolvableConflicts,
}: {
  numOfRulesWithoutConflicts: number;
  numOfRulesWithNonSolvableConflicts: number;
}) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.upgradeConflictsModal.rulesWithoutConflictsAndRulesWithNonSolvableConflicts"
    defaultMessage="{numOfRulesWithNonSolvableConflicts} of selected {numOfRules} rule(s) have unresolved conflicts. You may update only {numOfRulesWithoutConflicts} rules without conflicts. Rules with unresolved conflicts may be updated only via the flyout."
    values={{
      numOfRules: (
        <strong>{numOfRulesWithoutConflicts + numOfRulesWithNonSolvableConflicts}</strong>
      ),
      numOfRulesWithoutConflicts: <strong>{numOfRulesWithoutConflicts}</strong>,
      numOfRulesWithNonSolvableConflicts: <strong>{numOfRulesWithNonSolvableConflicts}</strong>,
    }}
  />
);

export const ALL_KINDS_OF_RULES = ({
  numOfRulesWithoutConflicts,
  numOfRulesWithSolvableConflicts,
  numOfRulesWithNonSolvableConflicts,
}: {
  numOfRulesWithoutConflicts: number;
  numOfRulesWithSolvableConflicts: number;
  numOfRulesWithNonSolvableConflicts: number;
}) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.upgradeConflictsModal.allKindsOfRules"
    defaultMessage="Selected {numOfRules} rules to update have {numOfRulesWithSolvableConflicts} rule(s) with auto-resolved conflicts and {numOfRulesWithNonSolvableConflicts} rule(s) have unresolved conflicts. You may proceed and update only {numOfRulesWithoutConflicts} rules without conflicts or update also {numOfRulesWithSolvableConflicts} rule(s) with auto-resolved conflicts which is potentially dangerous and may result in broken rules. Rules with unresolved conflicts may be updated only via the flyout."
    values={{
      numOfRules: (
        <strong>
          {numOfRulesWithoutConflicts +
            numOfRulesWithSolvableConflicts +
            numOfRulesWithNonSolvableConflicts}
        </strong>
      ),
      numOfRulesWithoutConflicts: <strong>{numOfRulesWithoutConflicts}</strong>,
      numOfRulesWithSolvableConflicts: <strong>{numOfRulesWithSolvableConflicts}</strong>,
      numOfRulesWithNonSolvableConflicts: <strong>{numOfRulesWithNonSolvableConflicts}</strong>,
    }}
  />
);
