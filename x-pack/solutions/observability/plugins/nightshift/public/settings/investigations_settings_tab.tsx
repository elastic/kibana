/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiHorizontalRule } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';
import { useKibana } from '../hooks/use_kibana';
import { RunLimitsSection } from './components/run_limits_section';
import { SettingsSaveBar } from './components/settings_save_bar';
import { SettingsSection, SettingsSectionRow } from './components/settings_section';
import { useRunLimitsForm } from './components/use_run_limits_form';

const INVESTIGATION_RUN_LIMIT_GROUPS = ['investigation'] as const;

export const InvestigationsSettingsTab = ({
  onCustomContextClick,
  canEditCustomContext = false,
}: {
  onCustomContextClick?: () => void;
  canEditCustomContext?: boolean;
}) => {
  const { appParams, application, http, overlays } = useKibana().services;
  const runLimits = useRunLimitsForm({ groups: INVESTIGATION_RUN_LIMIT_GROUPS });

  useUnsavedChangesPrompt({
    hasUnsavedChanges: runLimits.isDirty,
    http,
    openConfirm: overlays.openConfirm,
    navigateToUrl: application.navigateToUrl,
    history: appParams.history,
    shouldPromptOnReplace: false,
  });

  const saveRunLimits = async () => {
    await runLimits.requestSave();
  };

  const confirmRunLimits = async () => {
    await runLimits.confirmAndSave();
  };

  return (
    <>
      <SettingsSection
        title={i18n.translate('xpack.nightshift.settings.investigationProcessTitle', {
          defaultMessage: 'Investigation process',
        })}
        data-test-subj="nightshiftInvestigationProcessSection"
      >
        <RunLimitsSection
          groups={INVESTIGATION_RUN_LIMIT_GROUPS}
          form={runLimits}
          description={i18n.translate(
            'xpack.nightshift.settings.investigationRunLimitsDescription',
            {
              defaultMessage:
                'These limits apply only to automatic investigations; manual runs are not limited. When a limit is reached, new automatic investigations are blocked until it resets.',
            }
          )}
          onSave={saveRunLimits}
          onConfirmSave={confirmRunLimits}
        />
        {onCustomContextClick && (
          <>
            <EuiHorizontalRule margin="l" />
            <SettingsSectionRow
              title={i18n.translate('xpack.nightshift.settings.customContextTitle', {
                defaultMessage: 'Custom context',
              })}
              description={
                <p>
                  {i18n.translate('xpack.nightshift.settings.customContextDescription', {
                    defaultMessage:
                      'Notes that Nightshift adds to its system prompt for every investigation and chat in this space',
                  })}
                </p>
              }
              data-test-subj="nightshiftCustomContextSection"
            >
              <EuiButton
                size="s"
                iconType="pencil"
                onClick={onCustomContextClick}
                data-test-subj="nightshiftOpenCustomContext"
                {...getEbtProps({
                  action: NIGHTSHIFT_EBT_ACTIONS.OPEN_CUSTOM_CONTEXT,
                  element: NIGHTSHIFT_EBT_ELEMENTS.SETTINGS,
                })}
              >
                {canEditCustomContext
                  ? i18n.translate('xpack.nightshift.settings.editCustomContextButtonLabel', {
                      defaultMessage: 'Edit investigation context',
                    })
                  : i18n.translate('xpack.nightshift.settings.viewCustomContextButtonLabel', {
                      defaultMessage: 'View investigation context',
                    })}
              </EuiButton>
            </SettingsSectionRow>
          </>
        )}
      </SettingsSection>
      <SettingsSaveBar
        hasChanges={runLimits.isDirty}
        isSaving={runLimits.isSaving}
        onCancel={runLimits.cancel}
        onSave={saveRunLimits}
        isSaveDisabled={!runLimits.canManage || !runLimits.update}
      />
    </>
  );
};
