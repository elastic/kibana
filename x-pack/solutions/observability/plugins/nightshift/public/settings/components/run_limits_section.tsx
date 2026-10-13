/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import {
  EuiConfirmModal,
  EuiForm,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RunQuotaGroup } from '@kbn/significant-events-plugin/common';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';
import { isFiniteRunLimit, RUN_QUOTA_GROUPS } from './run_limit_draft';
import { RunLimitRow, RUN_QUOTA_GROUP_LABELS } from './run_limit_row';
import { RunQuotaExhaustionCallout } from './run_quota_exhaustion_callout';
import { SettingsSectionRow } from './settings_section';
import type { RunLimitsForm } from './use_run_limits_form';

export const RunLimitsSection = ({
  groups = RUN_QUOTA_GROUPS,
  form,
  description,
  onSave,
  onConfirmSave,
}: {
  groups?: readonly RunQuotaGroup[];
  form: RunLimitsForm;
  description?: ReactNode;
  onSave: () => Promise<void>;
  onConfirmSave: () => Promise<void>;
}) => {
  const {
    quotas,
    draftState,
    isSaving,
    canManage,
    saveError,
    updateLimitDraft,
    setLimitEnabled,
    showConfirmation,
    confirmationTitle,
    confirmationButtonText,
    warnings,
    closeConfirmation,
  } = form;
  const confirmationModalTitleId = useGeneratedHtmlId({
    prefix: 'saveRunLimitsConfirmationModalTitle',
  });
  const response = quotas.data;

  return (
    <>
      <SettingsSectionRow
        title={i18n.translate('xpack.nightshift.settings.runLimits.sectionTitle', {
          defaultMessage: 'Run limits',
        })}
        description={
          <p>
            {description ??
              i18n.translate('xpack.nightshift.settings.runLimits.sectionDescription', {
                defaultMessage:
                  'These limits apply only to scheduled activity. Manual runs are not limited. When a limit is reached, new scheduled runs are blocked until it resets.',
              })}
          </p>
        }
        data-test-subj="nightshiftRunLimitsSection"
      >
        {quotas.isLoading && <EuiLoadingSpinner size="m" />}

        {quotas.isError && (
          <KbnDangerCallout
            announceOnMount
            title={i18n.translate('xpack.nightshift.settings.runLimits.loadErrorMessage', {
              defaultMessage: 'Could not load daily run limits',
            })}
            actionProps={{
              primary: {
                children: i18n.translate('xpack.nightshift.settings.runLimits.retryButtonLabel', {
                  defaultMessage: 'Retry',
                }),
                onClick: () => void quotas.refetch(),
                'data-test-subj': 'nightshiftRunLimitsSectionRetryButton',
              },
            }}
          />
        )}

        {!quotas.isLoading && !quotas.isError && response && draftState && (
          <>
            <RunQuotaExhaustionCallout
              enabled={response.enabled}
              limits={response.limits}
              counts={response.counts}
              groups={groups}
            />

            <EuiForm component="div">
              {groups.map((group) => (
                <RunLimitRow
                  key={group}
                  group={group}
                  count={response.counts[group]}
                  limit={draftState.draft.limits[group]}
                  disabled={!canManage || isSaving}
                  onChange={(limit) => updateLimitDraft(group, limit)}
                  onEnabledChange={(enabled) => setLimitEnabled(group, enabled)}
                />
              ))}
            </EuiForm>

            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p data-test-subj="nightshiftRunLimitsResetTime">
                {i18n.translate('xpack.nightshift.settings.runLimits.counterResetDescription', {
                  defaultMessage: 'The current {timezone} day resets at {resetsAt}.',
                  values: {
                    timezone: response.window.timezone,
                    resetsAt: response.window.resetsAt,
                  },
                })}
              </p>
            </EuiText>

            {!canManage && (
              <>
                <EuiSpacer />
                <KbnInfoCallout
                  announceOnMount
                  title={i18n.translate('xpack.nightshift.settings.runLimits.readOnlyTitle', {
                    defaultMessage: 'Deployment-wide privileges required',
                  })}
                  text={i18n.translate('xpack.nightshift.settings.runLimits.readOnlyDescription', {
                    defaultMessage:
                      'Changing daily limits requires the Nightshift Manage and Configure privileges in all spaces.',
                  })}
                />
              </>
            )}

            {saveError && (
              <>
                <EuiSpacer />
                <KbnDangerCallout
                  announceOnMount
                  title={i18n.translate('xpack.nightshift.settings.runLimits.saveErrorTitle', {
                    defaultMessage: 'Could not save daily run limits',
                  })}
                  text={i18n.translate('xpack.nightshift.settings.runLimits.saveErrorDescription', {
                    defaultMessage:
                      'Your changes were kept. Review them and try again. Error: {error}',
                    values: { error: saveError.message },
                  })}
                  actionProps={{
                    primary: {
                      children: i18n.translate(
                        'xpack.nightshift.settings.runLimits.saveRetryButtonLabel',
                        {
                          defaultMessage: 'Try again',
                        }
                      ),
                      onClick: () => void onSave(),
                      'data-test-subj': 'nightshiftRunLimitsSectionTryAgainButton',
                    },
                  }}
                />
              </>
            )}
          </>
        )}
      </SettingsSectionRow>

      {showConfirmation && draftState && response && (
        <EuiConfirmModal
          aria-labelledby={confirmationModalTitleId}
          data-test-subj="nightshiftRunLimitsConfirmationModal"
          titleProps={{ id: confirmationModalTitleId }}
          title={confirmationTitle}
          onCancel={closeConfirmation}
          onConfirm={() => void onConfirmSave()}
          cancelButtonText={i18n.translate(
            'xpack.nightshift.settings.runLimits.confirmCancelButtonLabel',
            {
              defaultMessage: 'Keep editing',
            }
          )}
          confirmButtonText={confirmationButtonText}
          buttonColor="warning"
          isLoading={isSaving}
        >
          {warnings.loweringGroups.map((group) => {
            const limit = draftState.draft.limits[group];
            return isFiniteRunLimit(limit) ? (
              <p key={group}>
                {i18n.translate(
                  'xpack.nightshift.settings.runLimits.loweringEnabledGroupWarningDescription',
                  {
                    defaultMessage:
                      '{group} has {count} counted scheduled admissions today. Saving the lower limit of {limit} can deny new scheduled admissions until {resetsAt}.',
                    values: {
                      group: RUN_QUOTA_GROUP_LABELS[group],
                      count: response.counts[group],
                      limit,
                      resetsAt: response.window.resetsAt,
                    },
                  }
                )}
              </p>
            ) : null;
          })}
        </EuiConfirmModal>
      )}
    </>
  );
};
