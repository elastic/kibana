/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexItem } from '@elastic/eui';
import React, { memo } from 'react';
import { useAsyncActionWithLoading } from '../../../../common/hooks/use_async_action_with_loading';
import * as i18n from './translations';

interface EditRuleFormButtonsProps {
  onCancel: (ev: React.SyntheticEvent) => void;
  onSubmit: () => Promise<void>;
  isLoading: boolean;
  isDisabled: boolean;
}

/* Keeps the submitting state local, so toggling it doesn't re-render the whole page */
export const EditRuleFormButtons = memo(function EditRuleFormButtons({
  onCancel,
  onSubmit,
  isLoading,
  isDisabled,
}: EditRuleFormButtonsProps): JSX.Element {
  const [isSubmitting, submit] = useAsyncActionWithLoading(onSubmit);
  const isSaving = isSubmitting || isLoading;

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiButton iconType="cross" onClick={onCancel} isDisabled={isSaving}>
          {i18n.CANCEL}
        </EuiButton>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="ruleEditSubmitButton"
          fill
          onClick={submit}
          iconType="save"
          isLoading={isSaving}
          isDisabled={isDisabled}
        >
          {i18n.SAVE_CHANGES}
        </EuiButton>
      </EuiFlexItem>
    </>
  );
});
