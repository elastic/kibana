/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import * as i18n from './translations';

export interface RuleIdConfirmDialogConfirmation {
  rationale: string;
  ruleId: string;
}

export interface RuleIdConfirmDialogProps {
  /**
   * Evidence composed in by the caller — typically the proposed change and the
   * backtest, so the approver can decide inside the dialog.
   */
  children?: React.ReactNode;
  confirmLabel?: string;
  /** A server error (403 / 404 / 400) from the apply call, shown in place. */
  errorMessage?: string;
  /**
   * A rationale the analyst has **already** written, for a caller that opens this dialog as the
   * second step of one decision. Editable, like the rule id: this is the last word before a
   * production rule changes, so the field is seeded rather than fixed.
   */
  initialRationale?: string;
  /**
   * The rule id from `draft_tuning`'s structured output. It is LLM-authored and
   * may not name a real rule, which is exactly why this field is editable.
   */
  initialRuleId?: string;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: (confirmation: RuleIdConfirmDialogConfirmation) => void;
  ruleName?: string;
  title?: string;
}

interface ValidationErrors {
  rationale?: string;
  ruleId?: string;
}

/**
 * Confirms which detection rule a tuning proposal will change.
 *
 * Two things make this more than a yes/no confirm. The rule id is model-authored,
 * so `_apply` would 404 live on a hallucinated id — prefilling it in an editable
 * field is both the robustness fix and the object model's "Modify" affordance.
 * And `rationale` is mandatory and non-empty after trim on both `_respond` and
 * `_apply`, so there is no rationale-free path to offer.
 */
export const RuleIdConfirmDialog: React.FC<RuleIdConfirmDialogProps> = ({
  children,
  confirmLabel = i18n.CONFIRM,
  errorMessage,
  initialRationale,
  initialRuleId,
  isLoading = false,
  onCancel,
  onConfirm,
  ruleName,
  title = i18n.TITLE,
}) => {
  const [ruleId, setRuleId] = useState<string>(initialRuleId ?? '');
  const [rationale, setRationale] = useState<string>(initialRationale ?? '');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const modalTitleId = useGeneratedHtmlId();

  const onRuleIdChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRuleId(event.target.value);
    setErrors((previous) => ({ ...previous, ruleId: undefined }));
  }, []);

  const onRationaleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRationale(event.target.value);
    setErrors((previous) => ({ ...previous, rationale: undefined }));
  }, []);

  const onConfirmClick = useCallback(() => {
    const trimmedRuleId = ruleId.trim();
    const trimmedRationale = rationale.trim();
    const nextErrors: ValidationErrors = {
      ...(trimmedRuleId.length === 0 ? { ruleId: i18n.RULE_ID_REQUIRED } : {}),
      ...(trimmedRationale.length === 0 ? { rationale: i18n.RATIONALE_REQUIRED } : {}),
    };

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onConfirm({ rationale: trimmedRationale, ruleId: trimmedRuleId });
  }, [onConfirm, rationale, ruleId]);

  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      data-test-subj="pndRuleIdConfirmDialog"
      onClose={onCancel}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {ruleName != null ? (
          <>
            <EuiText data-test-subj="pndRuleIdConfirmDialogRuleName" size="s">
              <strong>{ruleName}</strong>
            </EuiText>
            <EuiSpacer size="s" />
          </>
        ) : null}
        {children != null ? (
          <>
            {children}
            <EuiSpacer size="m" />
          </>
        ) : null}
        <EuiForm component="form">
          <EuiFormRow
            error={
              errors.ruleId != null ? (
                <span data-test-subj="pndRuleIdConfirmDialogRuleIdError">{errors.ruleId}</span>
              ) : undefined
            }
            helpText={i18n.RULE_ID_HELP}
            isInvalid={errors.ruleId != null}
            label={i18n.RULE_ID_LABEL}
          >
            <EuiFieldText
              data-test-subj="pndRuleIdConfirmDialogRuleId"
              isInvalid={errors.ruleId != null}
              onChange={onRuleIdChange}
              value={ruleId}
            />
          </EuiFormRow>
          <EuiFormRow
            error={
              errors.rationale != null ? (
                <span data-test-subj="pndRuleIdConfirmDialogRationaleError">
                  {errors.rationale}
                </span>
              ) : undefined
            }
            helpText={i18n.RATIONALE_HELP}
            isInvalid={errors.rationale != null}
            label={i18n.RATIONALE_LABEL}
          >
            <EuiTextArea
              data-test-subj="pndRuleIdConfirmDialogRationale"
              isInvalid={errors.rationale != null}
              onChange={onRationaleChange}
              value={rationale}
            />
          </EuiFormRow>
        </EuiForm>
        {errorMessage != null ? (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              color="danger"
              data-test-subj="pndRuleIdConfirmDialogError"
              iconType="error"
              size="s"
              text={<p>{errorMessage}</p>}
              title={i18n.ERROR_TITLE}
            />
          </>
        ) : null}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="pndRuleIdConfirmDialogCancel" onClick={onCancel}>
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          data-test-subj="pndRuleIdConfirmDialogConfirm"
          fill
          isDisabled={isLoading}
          isLoading={isLoading}
          onClick={onConfirmClick}
        >
          {confirmLabel}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
