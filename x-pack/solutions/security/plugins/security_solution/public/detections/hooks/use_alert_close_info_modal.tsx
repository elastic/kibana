/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCheckbox,
  EuiConfirmModal,
  EuiLink,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING,
  SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM,
} from '../../../common/constants';
import { KibanaContextProvider, useKibana, useUiSetting$ } from '../../common/lib/kibana';
import * as i18n from './translations';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { getAlertSuppressionInfo } from '../containers/detection_engine/alerts/api';

export const DO_NOT_SHOW_AGAIN_SETTING_KEY = 'securitySolution.alertCloseInfoModal.doNotShowAgain';

const learnMoreLink = (
  <EuiLink data-test-subj="AlertCloseInfoModalLearnMoreLink" target="_blank">
    {i18n.ALERT_CLOSE_INFO_MODAL_LEARN_MORE_LINK}
  </EuiLink>
);

const restartSuppressionMessageComponent = (
  <FormattedMessage
    id="xpack.securitySolution.alert.closeInfoModal.restartSuppressionMessage"
    defaultMessage="Any new, duplicate events will be grouped and suppressed. Each unique group will be associated with a new alert. {link}."
    values={{
      link: learnMoreLink,
    }}
  />
);

const continueSuppressionMessageComponent = (
  <FormattedMessage
    id="xpack.securitySolution.alert.closeInfoModal.continueSuppressionMessage"
    defaultMessage="Duplicate events will continue to be grouped and suppressed, but new alerts won't be created for these groups. {link}."
    values={{
      link: learnMoreLink,
    }}
  />
);

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

  const { title, message } =
    currentSettingValue === SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING_ENUM.ContinueWindow
      ? {
          title: i18n.ALERT_CLOSE_INFO_MODAL_CONTINUE_SUPPRESSION_WINDOW_TITLE,
          message: continueSuppressionMessageComponent,
        }
      : {
          title: i18n.ALERT_CLOSE_INFO_MODAL_RESTART_SUPPRESSION_TITLE,
          message: restartSuppressionMessageComponent,
        };
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
      <EuiText>{message}</EuiText>
      <EuiSpacer size="m" />
      <EuiCheckbox
        data-test-subj="doNotShowAgainCheckbox"
        id={doNotShowAgainCheckboxId}
        label={i18n.ALERT_CLOSE_INFO_MODAL_DO_NOT_SHOW_AGAIN_LABEL}
        checked={doNotShowAgain}
        onChange={onDoNotShowAgainTicked}
      />
    </EuiConfirmModal>
  );
};

export const useAlertCloseInfoModal = () => {
  const experimentalFeatureEnabled = useIsExperimentalFeatureEnabled(
    'continueSuppressionWindowAdvancedSettingEnabled'
  );
  const [shouldShowModal, setShouldShowModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alertsWithSuppressionWindow, setAlertsWithSuppressionWindow] = useState(0);
  const [resolveUserConfirmation, setUserConfirmationResolver] = useState<
    (shouldContinue: boolean) => void
  >(() => () => false);
  const { overlays, services } = useKibana();
  const { storage } = services;

  const promptAlertCloseConfirmation = useCallback(
    async (getAlertParams: { alertIds?: string[]; query?: string }): Promise<boolean> => {
      if (!experimentalFeatureEnabled) {
        return Promise.resolve(true);
      }

      if (storage.get(DO_NOT_SHOW_AGAIN_SETTING_KEY)) {
        return Promise.resolve(true);
      }

      let alertCount = 0;
      try {
        const response = await getAlertSuppressionInfo(getAlertParams);
        alertCount = Object.keys(response.alerts).filter((alertId) => {
          return response.alerts[alertId].has_active_suppression_window;
        }).length;

        if (alertCount <= 0) {
          // We did not find any alert with an active suppression window
          return Promise.resolve(true);
        }
      } catch (error) {
        // We do not want to break alert closure. If the endpoint breaks somehow,
        // users should still be able to close alerts.
        return Promise.resolve(true);
      }

      return new Promise((resolvePromise) => {
        setAlertsWithSuppressionWindow(alertCount);
        setUserConfirmationResolver(() => resolvePromise);
        setShouldShowModal(true);
      });
    },
    [storage, experimentalFeatureEnabled]
  );

  const handleConfirmationResult = useCallback(
    (isConfirmed: boolean) => {
      resolveUserConfirmation(isConfirmed);
      setShouldShowModal(false);
    },
    [resolveUserConfirmation]
  );

  useEffect(() => {
    if (shouldShowModal && !isModalOpen) {
      setIsModalOpen(true);
      const modalRef = overlays.openModal(
        <KibanaContextProvider services={services}>
          <AlertCloseConfirmationModal
            onConfirmationResult={(result) => {
              modalRef.close();
              setIsModalOpen(false);
              handleConfirmationResult(result);
            }}
          />
        </KibanaContextProvider>
      );
    }
  }, [
    isModalOpen,
    shouldShowModal,
    overlays,
    services,
    alertsWithSuppressionWindow,
    handleConfirmationResult,
  ]);

  return {
    promptAlertCloseConfirmation,
  };
};
