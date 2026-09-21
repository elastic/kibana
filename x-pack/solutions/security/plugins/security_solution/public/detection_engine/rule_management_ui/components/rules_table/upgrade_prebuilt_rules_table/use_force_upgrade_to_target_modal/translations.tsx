/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RuleUpgradeCustomizationCounts } from '../../../../../rule_management/model/prebuilt_rule_upgrade';

export const FORCE_UPGRADE_TO_TARGET_MODAL_TITLE = (total: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.forceUpgradeToTargetModal.messageTitle', {
    defaultMessage: 'Update {total, plural, one {# rule} other {# rules}} to Elastic version?',
    values: { total },
  });

export const FORCE_UPGRADE_TO_TARGET_MODAL_CONFIRM = i18n.translate(
  'xpack.securitySolution.detectionEngine.forceUpgradeToTargetModal.confirmTitle',
  {
    defaultMessage: 'Update to Elastic version',
  }
);

export const FORCE_UPGRADE_TO_TARGET_MODAL_CANCEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.forceUpgradeToTargetModal.cancelTitle',
  {
    defaultMessage: 'Cancel',
  }
);

export const ForceUpgradeToTargetModalBody = ({
  total,
  customizedCount,
  ruleTypeChangeCount,
}: RuleUpgradeCustomizationCounts) => {
  const totalBold = <strong>{total}</strong>;

  return (
    <>
      <p>
        <FormattedMessage
          id="xpack.securitySolution.detectionEngine.forceUpgradeToTargetModal.body"
          defaultMessage="{totalBold} {total, plural, one {rule} other {rules}} will be updated to Elastic's version."
          values={{ total, totalBold }}
        />
        {customizedCount > 0 && (
          <>
            {' '}
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.forceUpgradeToTargetModal.customizedRules"
              defaultMessage="{customizedCountBold} of {totalBold} {customizedCount, plural, one {has} other {have}} changes that will be overwritten."
              values={{
                customizedCount,
                customizedCountBold: <strong>{customizedCount}</strong>,
                totalBold,
              }}
            />
          </>
        )}
      </p>
      {ruleTypeChangeCount !== 0 && (
        <p data-test-subj="forceUpgradeToTargetModalRuleTypeChangeWarning">
          {ruleTypeChangeCount === undefined ? (
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.forceUpgradeToTargetModal.possibleRuleTypeChange"
              defaultMessage="Rules whose Elastic version changes the rule type will be updated as well."
            />
          ) : (
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.forceUpgradeToTargetModal.ruleTypeChange"
              defaultMessage="{ruleTypeChangeCountBold} of {totalBold} {ruleTypeChangeCount, plural, one {has} other {have}} a rule type change."
              values={{
                ruleTypeChangeCount,
                ruleTypeChangeCountBold: <strong>{ruleTypeChangeCount}</strong>,
                totalBold,
              }}
            />
          )}{' '}
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.forceUpgradeToTargetModal.reviewActionsAndExceptions"
            defaultMessage="After updating, review your actions and exceptions, as some may need to be updated."
          />
        </p>
      )}
    </>
  );
};
