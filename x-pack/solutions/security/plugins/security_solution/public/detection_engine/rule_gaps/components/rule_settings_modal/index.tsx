/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiHorizontalRule,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { gapReasonType } from '@kbn/alerting-plugin/common';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { EXCLUDED_GAP_REASONS_KEY } from '../../../../../common/constants';
import {
  useCreateGapAutoFillScheduler,
  useUpdateGapAutoFillScheduler,
} from '../../api/hooks/use_gap_auto_fill_scheduler';
import * as i18n from '../../translations';
import { useGapAutoFillSchedulerContext } from '../../context/gap_auto_fill_scheduler_context';
import { GapAutoFillLogsFlyout } from '../gap_auto_fill_logs';

export interface RuleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RuleSettingsModal: React.FC<RuleSettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    canEditGapAutoFill,
    canAccessGapAutoFill,
    scheduler: gapAutoFillScheduler,
    isSchedulerLoading: isLoadingGapAutoFillScheduler,
  } = useGapAutoFillSchedulerContext();

  const { services } = useKibana();
  const gapReasonDetectionEnabled = useIsExperimentalFeatureEnabled('gapReasonDetectionEnabled');
  const canSaveAdvancedSettings = services.application.capabilities.advancedSettings?.save === true;

  const [isModalOpen, setIsModalOpen] = useState<boolean>(isOpen);
  const createMutation = useCreateGapAutoFillScheduler();
  const updateMutation = useUpdateGapAutoFillScheduler();
  const { addSuccess, addError } = useAppToasts();

  const [enabled, setEnabled] = useState<boolean>(false);
  const [includeDisabledGaps, setIncludeDisabledGaps] = useState<boolean>(false);
  const [isLogsFlyoutOpen, setIsLogsFlyoutOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (gapAutoFillScheduler) {
      setEnabled(gapAutoFillScheduler.enabled ?? false);
    }

    const excludedReasons = services.uiSettings.get<string[]>(EXCLUDED_GAP_REASONS_KEY);
    setIncludeDisabledGaps(!excludedReasons.includes(gapReasonType.RULE_DISABLED));
  }, [isOpen, gapAutoFillScheduler, services.uiSettings]);

  const isSaving = createMutation.isLoading || updateMutation.isLoading;

  const onSave = async () => {
    try {
      const newExcludedReasons = includeDisabledGaps ? [] : [gapReasonType.RULE_DISABLED];

      if (canAccessGapAutoFill && canEditGapAutoFill) {
        if (gapAutoFillScheduler) {
          await updateMutation.mutateAsync({
            ...gapAutoFillScheduler,
            enabled,
            excludedReasons: newExcludedReasons,
          });
        } else if (enabled) {
          await createMutation.mutateAsync({ excludedReasons: newExcludedReasons });
        }
      }

      if (canSaveAdvancedSettings) {
        await services.uiSettings?.set(EXCLUDED_GAP_REASONS_KEY, newExcludedReasons);
      }

      addSuccess({
        title: i18n.RULE_SETTINGS_TOAST_TITLE,
        text: i18n.RULE_SETTINGS_TOAST_TEXT,
      });
      onClose();
    } catch (err) {
      addError(err, { title: i18n.RULE_SETTINGS_TOAST_TITLE });
    }
  };

  const isFormElementDisabled =
    isSaving || (canAccessGapAutoFill && (isLoadingGapAutoFillScheduler || !canEditGapAutoFill));
  const canSaveAutoFill =
    canAccessGapAutoFill && canEditGapAutoFill && !isLoadingGapAutoFillScheduler;
  const canSaveGapScope = gapReasonDetectionEnabled && canSaveAdvancedSettings;
  const isSaveDisabled = isSaving || (!canSaveAutoFill && !canSaveGapScope);

  if (!canAccessGapAutoFill && !gapReasonDetectionEnabled) return null;

  return (
    <div>
      {isModalOpen && (
        <EuiModal
          style={{ width: 600 }}
          onClose={() => {
            onClose();
          }}
          aria-labelledby={i18n.RULE_SETTINGS_TITLE}
          data-test-subj="rule-settings-modal"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>{i18n.RULE_SETTINGS_TITLE}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiHorizontalRule margin="none" />

            {gapReasonDetectionEnabled && (
              <>
                <EuiSpacer size="m" />
                <EuiTitle size="xxs">
                  <h3>{i18n.GAP_DETECTION_SCOPE_HEADER}</h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s" color="subdued">
                  <p>
                    {canAccessGapAutoFill
                      ? i18n.GAP_DETECTION_SCOPE_DESCRIPTION_WITH_AUTO_FILL
                      : i18n.GAP_DETECTION_SCOPE_DESCRIPTION_WITHOUT_AUTO_FILL}
                  </p>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiFormRow>
                  <EuiCheckbox
                    id="include-disabled-gaps-checkbox"
                    data-test-subj="include-disabled-gaps-checkbox"
                    label={i18n.GAP_DETECTION_SCOPE_INCLUDE_DISABLED_LABEL}
                    checked={includeDisabledGaps}
                    onChange={(e) => setIncludeDisabledGaps(e.target.checked)}
                    disabled={isSaving || !canSaveAdvancedSettings}
                  />
                </EuiFormRow>
                <EuiSpacer size="l" />
              </>
            )}

            {canAccessGapAutoFill && (
              <>
                <EuiTitle size="xxs">
                  <h3>{i18n.GAP_AUTO_FILL_HEADER}</h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiFormRow>
                  <EuiSwitch
                    data-test-subj="rule-settings-enable-switch"
                    label={i18n.GAP_AUTO_FILL_TOGGLE_LABEL}
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    disabled={isFormElementDisabled}
                  />
                </EuiFormRow>
                <EuiSpacer size="m" />
                <EuiText size="s" color="subdued">
                  <p>
                    <FormattedMessage
                      id="xpack.securitySolution.detectionEngine.ruleSettings.autoGapFillSchedulerDescriptionDetail"
                      defaultMessage="The Auto gap fill setting lets you specify whether you want to automatically fill execution gaps that are detected for rules. You can track the status and history of gap fill jobs from the {logsLink}."
                      values={{
                        logsLink: (
                          <EuiLink
                            onClick={() => {
                              setIsLogsFlyoutOpen(true);
                              setIsModalOpen(false);
                            }}
                            data-test-subj="gap-fill-scheduler-logs-link"
                          >
                            <FormattedMessage
                              id="xpack.securitySolution.detectionEngine.ruleSettings.autoGapFillSchedulerLogsLinkText"
                              defaultMessage="Gap fill scheduler"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  </p>
                </EuiText>
                <EuiSpacer size="m" />
              </>
            )}
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={onClose}>{i18n.RULE_SETTINGS_MODAL_CANCEL}</EuiButtonEmpty>
            <EuiButton
              onClick={onSave}
              fill
              isLoading={isSaving}
              isDisabled={isSaveDisabled}
              data-test-subj="rule-settings-save"
            >
              {i18n.RULE_SETTINGS_MODAL_SAVE}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
      <GapAutoFillLogsFlyout isOpen={isLogsFlyoutOpen} onClose={() => onClose()} />
    </div>
  );
};
