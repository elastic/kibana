/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiSpacer, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import React, { useCallback } from 'react';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { APP_UI_ID, SecurityPageName } from '../../../../../common';
import { useKibana } from '../../../../common/lib/kibana';
import { useRestoreRule } from '../../../rule_management/logic/use_restore_rule';
import { getRuleDetailsUrl } from '../../../../common/components/link_to';
import * as i18n from './translations';

interface ChangeHistoryConfirmRestoreModalProps {
  ruleId: string;
  changeId: string;
  onCancel: () => void;
}

export const ChangeHistoryConfirmRestoreModal = ({
  ruleId,
  changeId,
  onCancel,
}: ChangeHistoryConfirmRestoreModalProps): JSX.Element => {
  const modalTitleId = useGeneratedHtmlId();
  const { addSuccess } = useAppToasts();
  const { application } = useKibana().services;
  const { navigateToApp } = application;

  // Restore rule
  const { mutateAsync: restoreRule, isLoading: isRestoring } = useRestoreRule();

  const handleRestoreRule = useCallback(async () => {
    try {
      await restoreRule({ id: ruleId, changeId });
      addSuccess(i18n.RULE_RESTORED_SUCESSFULLY);
      onCancel();
      setTimeout(
        () =>
          navigateToApp(APP_UI_ID, {
            deepLinkId: SecurityPageName.rules,
            path: getRuleDetailsUrl(ruleId ?? ''),
          }),
        100
      );
    } catch (err) {
      // TODO: Handle error message (for example "no changes")
    }
  }, [addSuccess, navigateToApp, onCancel, restoreRule, ruleId, changeId]);

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={i18n.CONFIRM_RESTORE_MODAL_TITLE}
      titleProps={{ id: modalTitleId }}
      data-test-subj="save-with-errors-confirmation-modal"
      onCancel={() => !isRestoring && onCancel()}
      onConfirm={handleRestoreRule}
      cancelButtonText={i18n.CANCEL_BUTTON_LABEL}
      confirmButtonText={i18n.CONFIRM_BUTTON_LABEL}
      defaultFocusedButton="confirm"
      confirmButtonDisabled={isRestoring}
    >
      <EuiText>{i18n.CONFIRM_RESTORE_MODAL_MESSAGE_1}</EuiText>
      <EuiSpacer size="s" />
      <EuiText>{i18n.CONFIRM_RESTORE_MODAL_MESSAGE_2}</EuiText>
      <EuiSpacer size="s" />
      <EuiText>{i18n.CONFIRM_RESTORE_MODAL_MESSAGE_3}</EuiText>
    </EuiConfirmModal>
  );
};
