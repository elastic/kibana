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
    defaultMessage: 'Exclude rules with conflicts?',
  }
);

export const UPGRADE_CONFLICTS_MODAL_CANCEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.upgradeConflictsModal.cancelTitle',
  {
    defaultMessage: 'Cancel',
  }
);

export const UPGRADE_RULES_WITHOUT_CONFLICTS = (rulesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.upgradeConflictsModal.upgradeRulesWithoutConflicts',
    {
      defaultMessage: 'Update {rulesCount, plural, =1 {rule} other {rules}} without conflicts',
      values: { rulesCount },
    }
  );

export const UPGRADE_RULES_WITH_CONFLICTS = (numOfRules: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.upgradeConflictsModal.upgradeRulesWithConflicts',
    {
      defaultMessage: 'Update {numOfRules, plural, =1 {rule} other {rules}}',
      values: { numOfRules },
    }
  );

const PROCEED_WITH_NO_CONCERNS = (numOfRules: number) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.upgradeConflictsModal.proceedWhenNoConcerns"
    defaultMessage="If you have no concerns and want to continue with the update, click {updateRules}."
    values={{ updateRules: <strong>{UPGRADE_RULES_WITH_CONFLICTS(numOfRules)}</strong> }}
  />
);

const PROCEED_WITH_CONFLICT_FREE_RULES = (numOfRules: number) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.upgradeConflictsModal.proceedWithConflictFreeRules"
    defaultMessage="Click {updateRulesWithoutConflicts} to update the {numOfRulesStrong} conflict-free {numOfRules, plural, =1 {rule} other {rules}}."
    values={{
      numOfRules,
      numOfRulesStrong: <strong>{numOfRules}</strong>,
      updateRulesWithoutConflicts: <strong>{UPGRADE_RULES_WITHOUT_CONFLICTS(numOfRules)}</strong>,
    }}
  />
);

const PROCEED_WITH_CONFLICT_FREE_AND_SOLVABLE_CONFLICT_RULES = ({
  numOfRulesWithoutConflicts,
  numOfRulesWithSolvableConflicts,
}: {
  numOfRulesWithoutConflicts: number;
  numOfRulesWithSolvableConflicts: number;
}) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.upgradeConflictsModal.proceedWithConflictFreeRules"
    defaultMessage="Click {updateRules} to update the {numOfRulesWithoutConflictsStrong} conflict-free {numOfRulesWithoutConflicts, plural, =1 {rule} other {rules}} and {numOfRulesWithSolvableConflictsStrong} {numOfRulesWithSolvableConflicts, plural, =1 {rule} other {rules}} with auto-resolved conflicts."
    values={{
      numOfRulesWithoutConflicts,
      numOfRulesWithoutConflictsStrong: <strong>{numOfRulesWithoutConflicts}</strong>,
      numOfRulesWithSolvableConflicts,
      numOfRulesWithSolvableConflictsStrong: <strong>{numOfRulesWithSolvableConflicts}</strong>,
      updateRules: (
        <strong>
          {UPGRADE_RULES_WITH_CONFLICTS(
            numOfRulesWithoutConflicts + numOfRulesWithSolvableConflicts
          )}
        </strong>
      ),
    }}
  />
);

export const ONLY_RULES_WITH_SOLVABLE_CONFLICTS = (numOfRules: number) => (
  <>
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.upgradeConflictsModal.onlySolvableConflicts"
      defaultMessage="The selected {numOfRules, plural, =1 {rule has} other {rules have}} auto-resolved conflicts. To safely update the {numOfRules, plural, =1 {rule} other {rules}}, we recommend addressing the conflicts from the rule's update flyout."
      values={{ numOfRules }}
    />
    <br />
    <br />
    {PROCEED_WITH_NO_CONCERNS(numOfRules)}
  </>
);

export const ONLY_RULES_WITH_NON_SOLVABLE_CONFLICTS = (numOfRules: number) => (
  <FormattedMessage
    id="xpack.securitySolution.detectionEngine.upgradeConflictsModal.onlyNonSolvableConflicts"
    defaultMessage="{numOfRulesStrong} selected {numOfRules, plural, =1 {rule has} other {rules have}} unresolved conflicts. Rules with unresolved conflicts can’t be bulk-updated. You must manually fix their conflicts before updating them."
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
  <>
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.upgradeConflictsModal.onlyRulesWithConflicts"
      defaultMessage="Selected rules have conflicts. To safely update the rules, we recommend addressing the conflicts from the rule's update flyout."
    />
    <br />
    <br />
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.upgradeConflictsModal.unresolvedConflictsCanNotBeBulkUpdated"
      defaultMessage="{numOfRulesWithNonSolvableConflictsStrong} out of the selected {numOfRulesStrong} {numOfRules, plural, =1 {rule} other {rules}} with unresolved conflicts can’t be bulk-updated. You must manually fix their conflicts before updating them."
      values={{
        numOfRules: numOfRulesWithSolvableConflicts + numOfRulesWithNonSolvableConflicts,
        numOfRulesStrong: (
          <strong>{numOfRulesWithSolvableConflicts + numOfRulesWithNonSolvableConflicts}</strong>
        ),
        numOfRulesWithNonSolvableConflictsStrong: (
          <strong>{numOfRulesWithNonSolvableConflicts}</strong>
        ),
      }}
    />
    <br />
    <br />
    {PROCEED_WITH_NO_CONCERNS(numOfRulesWithSolvableConflicts)}
  </>
);

export const RULES_WITHOUT_CONFLICTS_AND_RULES_WITH_NON_SOLVABLE_CONFLICTS = ({
  numOfRulesWithoutConflicts,
  numOfRulesWithNonSolvableConflicts,
}: {
  numOfRulesWithoutConflicts: number;
  numOfRulesWithNonSolvableConflicts: number;
}) => (
  <>
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.upgradeConflictsModal.rulesWithoutConflictsAndRulesWithNonSolvableConflicts"
      defaultMessage="{numOfRulesWithNonSolvableConflictsStrong} of the {numOfRulesStrong} selected rules {numOfRulesWithNonSolvableConflicts, plural, =1 {has} other {have}} unresolved conflicts, which cannot be bulk-updated until you manually fix them."
      values={{
        numOfRulesStrong: (
          <strong>{numOfRulesWithoutConflicts + numOfRulesWithNonSolvableConflicts}</strong>
        ),
        numOfRulesWithNonSolvableConflicts,
        numOfRulesWithNonSolvableConflictsStrong: (
          <strong>{numOfRulesWithNonSolvableConflicts}</strong>
        ),
      }}
    />
    <br />
    <br />
    {PROCEED_WITH_CONFLICT_FREE_RULES(numOfRulesWithoutConflicts)}
  </>
);

export const RULES_WITHOUT_CONFLICTS_AND_RULES_WITH_SOLVABLE_CONFLICTS = ({
  numOfRulesWithoutConflicts,
  numOfRulesWithSolvableConflicts,
}: {
  numOfRulesWithoutConflicts: number;
  numOfRulesWithSolvableConflicts: number;
}) => (
  <>
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.upgradeConflictsModal.rulesWithoutConflictsAndRulesWithSolvableConflicts"
      defaultMessage="{numOfRulesWithSolvableConflictsStrong} of the {numOfRulesStrong} selected {numOfRules, plural, =1 {rule has} other {rules have}} auto-resolved conflicts. To safely update them, we recommend addressing the conflicts from the rule update flyout."
      values={{
        numOfRules: numOfRulesWithoutConflicts + numOfRulesWithSolvableConflicts,
        numOfRulesStrong: (
          <strong>{numOfRulesWithoutConflicts + numOfRulesWithSolvableConflicts}</strong>
        ),
        numOfRulesWithSolvableConflictsStrong: <strong>{numOfRulesWithSolvableConflicts}</strong>,
      }}
    />
    <br />
    <br />
    {PROCEED_WITH_CONFLICT_FREE_RULES(numOfRulesWithoutConflicts)}
    <br />
    {PROCEED_WITH_CONFLICT_FREE_AND_SOLVABLE_CONFLICT_RULES({
      numOfRulesWithoutConflicts,
      numOfRulesWithSolvableConflicts,
    })}
  </>
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
      defaultMessage="{numOfRulesWithConflictsStrong} of the {numOfRulesStrong} selected rules have conflicts. To safely update the {numOfRulesWithSolvableConflictsStrong} {numOfRulesWithSolvableConflicts, plural, =1 {rule} other {rules}} with auto-resolved conflicts, we recommend addressing the conflicts from the rule update flyout. The {numOfRulesWithNonSolvableConflictsStrong} {numOfRulesWithNonSolvableConflicts, plural, =1 {rule} other {rules}} with unresolved conflicts cannot be bulk-updated until you manually fix them."
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
        numOfRulesWithSolvableConflicts,
        numOfRulesWithSolvableConflictsStrong: <strong>{numOfRulesWithSolvableConflicts}</strong>,
        numOfRulesWithNonSolvableConflicts,
        numOfRulesWithNonSolvableConflictsStrong: (
          <strong>{numOfRulesWithNonSolvableConflicts}</strong>
        ),
      }}
    />
    <br />
    <br />
    {PROCEED_WITH_CONFLICT_FREE_RULES(numOfRulesWithoutConflicts)}
    <br />
    {PROCEED_WITH_CONFLICT_FREE_AND_SOLVABLE_CONFLICT_RULES({
      numOfRulesWithoutConflicts,
      numOfRulesWithSolvableConflicts,
    })}
  </>
);
