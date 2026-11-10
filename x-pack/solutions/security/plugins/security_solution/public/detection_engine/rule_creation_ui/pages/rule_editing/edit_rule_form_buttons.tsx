/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { EuiButton, EuiFlexItem } from '@elastic/eui';
import { waitForNextPaint } from '../../../../common/utils/wait_for_next_paint';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  // onSubmit starts with CPU-heavy synchronous form validation, which blocks the browser from
  // painting until it finishes. Waiting for the next paint first shows the loading state right away.
  const submit = useCallback(async () => {
    setIsSubmitting(true);

    try {
      await waitForNextPaint();
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit]);
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
