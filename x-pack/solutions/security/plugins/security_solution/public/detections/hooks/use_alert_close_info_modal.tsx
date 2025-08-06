/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiCheckbox, EuiConfirmModal, EuiSpacer, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import {
  SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING,
  SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM,
} from '../../../common/constants';
import { KibanaContextProvider, useKibana, useUiSetting$ } from '../../common/lib/kibana';
import * as i18n from './translations';

const DO_NOT_SHOW_AGAIN_SETTING_KEY = 'securitySolution.alertCloseInfoModal.doNotShowAgain';

const AlertCloseConfirmationModal = ({
  onConfirmationResult,
}: {
  onConfirmationResult: (isConfirmed: boolean) => void;
}) => {
  const { storage } = useKibana().services;
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  const modalTitleId = useGeneratedHtmlId();
  const doNotShowAgainCheckboxId = useGeneratedHtmlId();
  const [currentSettingValue] = useUiSetting$<SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM>(
    SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING
  );
  const onDoNotShowAgainTicked = useCallback(() => {
    setDoNotShowAgain(!doNotShowAgain);
  }, [doNotShowAgain]);

  const onConfirm = useCallback(() => {
    onConfirmationResult(true);
    storage.set(DO_NOT_SHOW_AGAIN_SETTING_KEY, doNotShowAgain);
  }, [onConfirmationResult, storage, doNotShowAgain]);

  const onCancel = useCallback(() => onConfirmationResult(false), [onConfirmationResult]);

  const title =
    currentSettingValue === SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM.ContinueWindow
      ? i18n.ALERT_CLOSE_INFO_MODAL_CONTINUE_SUPPRESSION_WINDOW_TITLE
      : i18n.ALERT_CLOSE_INFO_MODAL_RESTART_SUPPRESSION_TITLE;

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={title}
      titleProps={{ id: modalTitleId }}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmButtonText={i18n.ALERT_CLOSE_INFO_MODAL_CONFIRM_LABEL}
      cancelButtonText={i18n.ALERT_CLOSE_INFO_MODAL_CANCEL_LABEL}
      defaultFocusedButton="confirm"
      data-test-subj="alertCloseInfoModal"
    >
      <EuiText>{i18n.ALERT_CLOSE_INFO_MODAL_CONTACT_ADMIN_MESSAGE}</EuiText>
      <EuiSpacer size="m" />
      <EuiCheckbox
        data-test-subj='doNotShowAgainCheckbox'
        id={doNotShowAgainCheckboxId}
        label={i18n.ALERT_CLOSE_INFO_MODAL_DO_NOT_SHOW_AGAIN_LABEL}
        checked={doNotShowAgain}
        onChange={onDoNotShowAgainTicked}
      />
    </EuiConfirmModal>
  );
};

export const useAlertCloseInfoModal = () => {
  const [shouldShowModal, setShouldShowModal] = useState(false);
  const [resolveUserConfirmation, setUserConfirmationResolver] = useState<
    (shouldContinue: boolean) => void
  >(() => () => false);
  const { overlays, services } = useKibana();
  const { storage } = services;

  const promptAlertCloseConfirmation = useCallback((): Promise<boolean> => {
    if (storage.get(DO_NOT_SHOW_AGAIN_SETTING_KEY)) {
      return Promise.resolve(true);
    }
    setShouldShowModal(true);
    return new Promise((resolvePromise) => {
      setUserConfirmationResolver(() => resolvePromise);
    });
  }, [storage]);

  const handleConfirmationResult = useCallback(
    (isConfirmed: boolean) => {
      resolveUserConfirmation(isConfirmed);
      setShouldShowModal(false);
    },
    [resolveUserConfirmation]
  );

  useEffect(() => {
    if (shouldShowModal) {
      const modalRef = overlays.openModal(
        <KibanaContextProvider services={services}>
          <AlertCloseConfirmationModal
            onConfirmationResult={(result) => {
              modalRef.close();
              handleConfirmationResult(result);
            }}
          />
        </KibanaContextProvider>
      );
    }
  }, [shouldShowModal, overlays, services, handleConfirmationResult]);

  return {
    promptAlertCloseConfirmation,
  };
};
