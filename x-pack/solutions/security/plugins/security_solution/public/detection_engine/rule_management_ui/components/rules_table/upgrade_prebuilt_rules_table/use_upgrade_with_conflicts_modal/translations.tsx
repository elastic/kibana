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
    defaultMessage: 'Update rules without conflicts',
  }
);

export const UPGRADE_RULES_WITH_CONFLICTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeConflictsModal.upgradeRulesWithConflicts',
  {
    defaultMessage: 'Update rules',
  }
);

export const ONLY_RULES_WITH_SOLVABLE_CONFLICTS = (numOfRules: number) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.upgradeConflictsModal.onlySolvableConflicts"
    defaultMessage="{numOfRulesStrong} selected {numOfRules, plural, =1 {rule has} other {rules have}} auto-resolved conflicts. You may proceed updating without reviewing conflicts but this operation is potentially dangerous and may result in broken rules."
    values={{ numOfRules, numOfRulesStrong: <strong>{numOfRules}</strong> }}
  />
);

export const ONLY_RULES_WITH_NON_SOLVABLE_CONFLICTS = (numOfRules: number) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.upgradeConflictsModal.onlyNonSolvableConflicts"
    defaultMessage="{numOfRulesStrong} selected {numOfRules, plural, =1 {rule has} other {rules have}} unresolved conflicts. Please review and update them individually via the flyout."
    values={{ numOfRules, numOfRulesStrong: <strong>{numOfRules}</strong> }}
  />
);

export const ONLY_RULES_WITH_CONFLICTS = ({
  numOfRulesWithSolvableConflicts,
  numOfRulesWithNonSolvableConflicts,
}: {
  numOfRulesWithSolvableConflicts: number;
  numOfRulesWithNonSolvableConflicts: number;
}) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.upgradeConflictsModal.rulesWithoutConflictsAndRulesWithNonSolvableConflicts"
    defaultMessage="{numOfRulesStrong} selected {numOfRules, plural, =1 {rule has} other {rules have}} conflicts. You may proceed updating {numOfRulesWithSolvableConflictsStrong} {numOfRulesWithSolvableConflicts, plural, =1 {rule} other {rules}} with auto-resolved conflicts but this operation is potentially dangerous and may result in broken rules. Rules with unresolved conflicts may be updated only via the flyout."
    values={{
      numOfRules: numOfRulesWithSolvableConflicts + numOfRulesWithNonSolvableConflicts,
      numOfRulesStrong: (
        <strong>{numOfRulesWithSolvableConflicts + numOfRulesWithNonSolvableConflicts}</strong>
      ),
      numOfRulesWithSolvableConflicts,
      numOfRulesWithSolvableConflictsStrong: <strong>{numOfRulesWithSolvableConflicts}</strong>,
    }}
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
    defaultMessage="{numOfRulesWithNonSolvableConflicts} of {numOfRulesStrong} selected {numOfRules, plural, =1 {rule has} other {rules have}} unresolved conflicts. You may proceed updating only {numOfRulesWithoutConflictsStrong} {numOfRulesWithoutConflicts, plural, =1 {rule} other {rules}} without conflicts. Rules with unresolved conflicts may be updated only via the flyout."
    values={{
      numOfRules: numOfRulesWithoutConflicts + numOfRulesWithNonSolvableConflicts,
      numOfRulesStrong: (
        <strong>{numOfRulesWithoutConflicts + numOfRulesWithNonSolvableConflicts}</strong>
      ),
      numOfRulesWithoutConflicts,
      numOfRulesWithoutConflictsStrong: <strong>{numOfRulesWithoutConflicts}</strong>,
      numOfRulesWithNonSolvableConflicts: <strong>{numOfRulesWithNonSolvableConflicts}</strong>,
    }}
  />
);

export const RULES_WITHOUT_CONFLICTS_AND_RULES_WITH_SOLVABLE_CONFLICTS = ({
  numOfRulesWithoutConflicts,
  numOfRulesWithSolvableConflicts,
}: {
  numOfRulesWithoutConflicts: number;
  numOfRulesWithSolvableConflicts: number;
}) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.upgradeConflictsModal.rulesWithoutConflictsAndRulesWithSolvableConflicts"
    defaultMessage="{numOfRulesWithSolvableConflictsStrong} of {numOfRulesStrong} selected rules have auto-resolved conflicts. You may proceed and update only {numOfRulesWithoutConflictsStrong} {numOfRulesWithoutConflicts, plural, =1 {rule} other {rules}} without conflicts or update all rules which is potentially dangerous and may result in broken rules."
    values={{
      numOfRulesStrong: (
        <strong>{numOfRulesWithoutConflicts + numOfRulesWithSolvableConflicts}</strong>
      ),
      numOfRulesWithoutConflicts,
      numOfRulesWithoutConflictsStrong: <strong>{numOfRulesWithoutConflicts}</strong>,
      numOfRulesWithSolvableConflictsStrong: <strong>{numOfRulesWithSolvableConflicts}</strong>,
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
  <>
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.upgradeConflictsModal.allKindsOfRules"
      defaultMessage="{numOfRulesWithConflictsStrong} of {numOfRulesStrong} selected rules have conflicts. You may proceed and update only {numOfRulesWithoutConflictsStrong} {numOfRulesWithoutConflicts, plural, =1 {rule} other {rules}} without conflicts or update also {numOfRulesWithSolvableConflictsStrong} {numOfRulesWithSolvableConflicts, plural, =1 {rule} other {rules}} with auto-resolved conflicts which is potentially dangerous and may result in broken rules."
      values={{
        numOfRulesStrong: (
          <strong>
            {numOfRulesWithoutConflicts +
              numOfRulesWithSolvableConflicts +
              numOfRulesWithNonSolvableConflicts}
          </strong>
        ),
        numOfRulesWithConflictsStrong: (
          <strong>{numOfRulesWithSolvableConflicts + numOfRulesWithNonSolvableConflicts}</strong>
        ),
        numOfRulesWithoutConflicts,
        numOfRulesWithoutConflictsStrong: <strong>{numOfRulesWithoutConflicts}</strong>,
        numOfRulesWithSolvableConflicts,
        numOfRulesWithSolvableConflictsStrong: <strong>{numOfRulesWithSolvableConflicts}</strong>,
      }}
    />
    {numOfRulesWithNonSolvableConflicts > 0 && (
      <FormattedMessage
        id="xpack.securitySolution.detectionEngine.upgradeConflictsModal.unresolvedConflicts"
        defaultMessage="Rules with unresolved conflicts may be updated only via the flyout."
      />
    )}
  </>
);
