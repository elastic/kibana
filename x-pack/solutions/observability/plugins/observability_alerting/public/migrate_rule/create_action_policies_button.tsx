/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const getDisabledReason = (isRuleCreated: boolean, readyCount: number): string | undefined => {
  if (!isRuleCreated) {
    return i18n.translate('xpack.observabilityAlerting.migrateRule.actions.createRuleFirst', {
      defaultMessage: 'Create the rule first. Action policies match the new rule by its tag.',
    });
  }
  if (readyCount === 0) {
    return i18n.translate('xpack.observabilityAlerting.migrateRule.actions.nothingReady', {
      defaultMessage: 'No converted actions are ready to create.',
    });
  }
  return undefined;
};

export const CreateActionPoliciesButton = ({
  readyCount,
  isRuleCreated,
  isCreating,
  createdCount,
  onCreate,
  onView,
}: {
  readyCount: number;
  isRuleCreated: boolean;
  isCreating: boolean;
  /** Set once the policies are created; switches the button to view them. */
  createdCount?: number;
  onCreate: () => void;
  onView: () => void;
}) => {
  if (createdCount !== undefined) {
    return (
      <EuiButton size="s" fill onClick={onView} data-test-subj="migrateRuleViewActionPolicies">
        {i18n.translate('xpack.observabilityAlerting.migrateRule.actions.viewPolicies', {
          defaultMessage: 'View action policies',
        })}
      </EuiButton>
    );
  }

  const disabledReason = getDisabledReason(isRuleCreated, readyCount);
  return (
    <EuiToolTip content={disabledReason}>
      <EuiButton
        size="s"
        fill
        onClick={onCreate}
        isLoading={isCreating}
        isDisabled={Boolean(disabledReason)}
        data-test-subj="migrateRuleCreateActionPolicies"
      >
        {i18n.translate('xpack.observabilityAlerting.migrateRule.actions.createPolicies', {
          defaultMessage: 'Create {count, plural, one {action policy} other {# action policies}}',
          values: { count: readyCount },
        })}
      </EuiButton>
    </EuiToolTip>
  );
};
