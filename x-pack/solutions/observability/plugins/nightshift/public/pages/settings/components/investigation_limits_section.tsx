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
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';
import {
  INVESTIGATION_QUOTA_GROUPS,
  isValidFiniteInvestigationLimit,
} from './investigation_limit_draft';
import { INVESTIGATION_QUOTA_GROUP_LABELS, InvestigationLimitRow } from './investigation_limit_row';
import { InvestigationQuotaExhaustionCallout } from './investigation_quota_exhaustion_callout';
import { SettingsSectionRow } from './settings_section';
import type { InvestigationLimitsForm } from './use_investigation_limits_form';

export const InvestigationLimitsSection = ({
  form,
  description,
  onSave,
  onConfirmSave,
}: {
  form: InvestigationLimitsForm;
  description: ReactNode;
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
    setEnabled,
    showConfirmation,
    confirmationTitle,
    confirmationButtonText,
    loweringGroups,
    closeConfirmation,
  } = form;
  const confirmationModalTitleId = useGeneratedHtmlId({
    prefix: 'saveInvestigationLimitsConfirmationModalTitle',
  });
  const response = quotas.data;
  const enforced = draftState?.draft.enabled === true;

  return (
    <>
      <SettingsSectionRow
        title={i18n.translate('xpack.nightshift.settings.runLimits.sectionTitle', {
          defaultMessage: 'Run limits',
        })}
        description={<p>{description}</p>}
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
            <InvestigationQuotaExhaustionCallout
              enabled={response.enabled}
              limits={response.limits}
              counts={response.counts}
            />

            <EuiForm component="div">
              <EuiFormRow>
                <EuiSwitch
                  label={i18n.translate(
                    'xpack.nightshift.settings.runLimits.sharedEnabledSwitchLabel',
                    { defaultMessage: 'Enforce daily limits' }
                  )}
                  checked={enforced}
                  disabled={!canManage || isSaving}
                  onChange={(event) => setEnabled(event.target.checked)}
                  data-test-subj="nightshiftRunLimitsEnabledSwitch"
                />
              </EuiFormRow>
              <EuiSpacer size="m" />
              {INVESTIGATION_QUOTA_GROUPS.map((group, index) => (
                <React.Fragment key={group}>
                  {index > 0 ? <EuiSpacer size="l" /> : null}
                  <InvestigationLimitRow
                    group={group}
                    count={response.counts[group]}
                    limit={draftState.draft.limits[group]}
                    disabled={!canManage || isSaving}
                    enforced={enforced}
                    onChange={(limit) => updateLimitDraft(group, limit)}
                  />
                </React.Fragment>
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
                      'Changing daily limits requires the nightshift Manage and Configure privileges in all spaces.',
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
                        { defaultMessage: 'Try again' }
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
            { defaultMessage: 'Keep editing' }
          )}
          confirmButtonText={confirmationButtonText}
          buttonColor="warning"
          isLoading={isSaving}
        >
          {loweringGroups.map((group) => {
            const limit = draftState.draft.limits[group];
            return isValidFiniteInvestigationLimit(limit) ? (
              <p key={group}>
                {i18n.translate(
                  'xpack.nightshift.settings.investigationLimits.loweringWarningDescription',
                  {
                    defaultMessage:
                      '{group} has {count, plural, one {# investigation} other {# investigations}} started today. Saving the lower limit of {limit} blocks new investigations it covers until {resetsAt}.',
                    values: {
                      group: INVESTIGATION_QUOTA_GROUP_LABELS[group],
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
