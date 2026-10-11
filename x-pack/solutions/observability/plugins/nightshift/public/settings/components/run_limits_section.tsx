/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RunQuotaGroup } from '@kbn/significant-events-plugin/common';
import { useRunQuotas, useUpdateRunQuotas } from '../hooks/use_significant_events_run_quotas';
import {
  buildRunQuotaSettingsUpdate,
  createRunQuotaDraftState,
  hasRunQuotaDraftChanges,
  isFiniteRunLimit,
  isLowerFiniteLimit,
  RUN_QUOTA_GROUPS,
  type RunLimitDraft,
  type RunQuotaDraftState,
} from './run_limit_draft';
import { RunLimitRow, RUN_QUOTA_GROUP_LABELS } from './run_limit_row';
import { RunQuotaExhaustionCallout } from './run_quota_exhaustion_callout';
import { SettingsSectionRow } from './settings_section';

interface SaveWarnings {
  disabling: boolean;
  enablingExhaustedGroups: RunQuotaGroup[];
  loweringGroups: RunQuotaGroup[];
}

const hasSaveWarnings = ({
  disabling,
  enablingExhaustedGroups,
  loweringGroups,
}: SaveWarnings): boolean =>
  disabling || enablingExhaustedGroups.length > 0 || loweringGroups.length > 0;

export const RunLimitsSection = ({
  groups = RUN_QUOTA_GROUPS,
  onUnsavedChangesChange,
}: {
  groups?: readonly RunQuotaGroup[];
  onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
}) => {
  const quotas = useRunQuotas();
  const { save, isSaving } = useUpdateRunQuotas();
  const [draftState, setDraftState] = useState<RunQuotaDraftState>();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saveError, setSaveError] = useState<Error>();
  const confirmationModalTitleId = useGeneratedHtmlId({
    prefix: 'saveRunLimitsConfirmationModalTitle',
  });

  useEffect(() => {
    if (!quotas.data) {
      return;
    }
    setDraftState((current) =>
      current && hasRunQuotaDraftChanges(current) ? current : createRunQuotaDraftState(quotas.data)
    );
  }, [quotas.data]);

  const update = useMemo(
    () => (draftState ? buildRunQuotaSettingsUpdate(draftState) : undefined),
    [draftState]
  );

  const warnings = useMemo<SaveWarnings>(() => {
    if (!draftState || !quotas.data) {
      return {
        disabling: false,
        enablingExhaustedGroups: [],
        loweringGroups: [],
      };
    }
    const response = quotas.data;

    const enabling =
      !draftState.saved.enabled && draftState.draft.enabled
        ? RUN_QUOTA_GROUPS.filter((group) => {
            const limit = draftState.draft.limits[group];
            return isFiniteRunLimit(limit) && response.counts[group] >= limit;
          })
        : [];
    const lowering = groups.filter((group) => {
      const next = draftState.draft.limits[group];
      return (
        next !== draftState.saved.limits[group] &&
        isLowerFiniteLimit(draftState.saved.limits[group], next) &&
        response.counts[group] >= next
      );
    });

    return {
      disabling: draftState.saved.enabled && !draftState.draft.enabled,
      enablingExhaustedGroups: enabling,
      loweringGroups: lowering,
    };
  }, [draftState, groups, quotas.data]);

  const performSave = useCallback(async () => {
    if (!update) {
      return;
    }

    setSaveError(undefined);
    try {
      const response = await save(update);
      setDraftState(createRunQuotaDraftState(response));
      setShowConfirmation(false);
    } catch (error) {
      setShowConfirmation(false);
      setSaveError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [save, update]);

  const handleSave = useCallback(() => {
    if (hasSaveWarnings(warnings)) {
      setShowConfirmation(true);
      return;
    }
    void performSave();
  }, [performSave, warnings]);

  const updateEnabledDraft = useCallback((enabled: boolean) => {
    setSaveError(undefined);
    setDraftState((current) =>
      current
        ? {
            ...current,
            draft: {
              ...current.draft,
              enabled,
            },
          }
        : current
    );
  }, []);

  const updateLimitDraft = useCallback((group: RunQuotaGroup, limit: RunLimitDraft) => {
    setSaveError(undefined);
    setDraftState((current) =>
      current
        ? {
            ...current,
            draft: {
              ...current.draft,
              limits: {
                ...current.draft.limits,
                [group]: limit,
              },
            },
          }
        : current
    );
  }, []);

  const canManage = quotas.data?.canManage === true;
  const isDirty = draftState ? hasRunQuotaDraftChanges(draftState) : false;
  const response = quotas.data;

  useEffect(() => {
    onUnsavedChangesChange?.(isDirty);
  }, [isDirty, onUnsavedChangesChange]);

  const confirmationTitle = warnings.disabling
    ? i18n.translate('xpack.nightshift.settings.runLimits.disableConfirmTitle', {
        defaultMessage: 'Disable daily run limits?',
      })
    : warnings.enablingExhaustedGroups.length > 0
    ? i18n.translate('xpack.nightshift.settings.runLimits.enableReachedConfirmTitle', {
        defaultMessage: 'Enable enforcement with reached limits?',
      })
    : i18n.translate('xpack.nightshift.settings.runLimits.loweringConfirmTitle', {
        defaultMessage: 'Lower limits to values already reached?',
      });

  const confirmationButtonText = warnings.disabling
    ? i18n.translate('xpack.nightshift.settings.runLimits.disableConfirmButtonLabel', {
        defaultMessage: 'Disable and save changes',
      })
    : warnings.enablingExhaustedGroups.length > 0
    ? i18n.translate('xpack.nightshift.settings.runLimits.enableConfirmButtonLabel', {
        defaultMessage: 'Enable and save changes',
      })
    : i18n.translate('xpack.nightshift.settings.runLimits.loweringConfirmButtonLabel', {
        defaultMessage: 'Save lower limits',
      });

  return (
    <>
      <SettingsSectionRow
        title={i18n.translate('xpack.nightshift.settings.runLimits.sectionTitle', {
          defaultMessage: 'Run limits',
        })}
        description={
          <p>
            {i18n.translate('xpack.nightshift.settings.runLimits.sectionDescription', {
              defaultMessage:
                'Daily limits apply only to scheduled activity. Manual runs are not limited. Enforcement applies deployment-wide to all Nightshift categories, including categories not shown on this tab. When a limit is reached, new scheduled runs are blocked until it resets.',
            })}
          </p>
        }
        data-test-subj="nightshiftRunLimitsSection"
      >
        {draftState && quotas.data && (
          <EuiForm component="div" fullWidth>
            <EuiFormRow fullWidth>
              <EuiSwitch
                data-test-subj="nightshiftRunLimitsEnforcementSwitch"
                label={i18n.translate(
                  'xpack.nightshift.settings.runLimits.enforcementSwitchLabel',
                  {
                    defaultMessage: 'Enforce daily limits across Nightshift',
                  }
                )}
                checked={draftState.draft.enabled}
                disabled={!canManage || isSaving}
                onChange={(event) => updateEnabledDraft(event.target.checked)}
              />
            </EuiFormRow>
          </EuiForm>
        )}

        {quotas.isLoading && <EuiLoadingSpinner size="m" />}

        {quotas.isError && (
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="error"
            title={i18n.translate('xpack.nightshift.settings.runLimits.loadErrorMessage', {
              defaultMessage: 'Could not load daily run limits',
            })}
          >
            <EuiButton
              data-test-subj="nightshiftRunLimitsSectionRetryButton"
              size="s"
              onClick={() => void quotas.refetch()}
            >
              {i18n.translate('xpack.nightshift.settings.runLimits.retryButtonLabel', {
                defaultMessage: 'Retry',
              })}
            </EuiButton>
          </EuiCallOut>
        )}

        {!quotas.isLoading && !quotas.isError && response && draftState && (
          <>
            {draftState.draft.enabled && (
              <>
                <RunQuotaExhaustionCallout
                  enabled={response.enabled}
                  limits={response.limits}
                  counts={response.counts}
                  groups={groups}
                />

                <EuiSpacer />
                <EuiForm component="div" fullWidth>
                  {groups.map((group) => (
                    <RunLimitRow
                      key={group}
                      group={group}
                      count={response.counts[group]}
                      limit={draftState.draft.limits[group]}
                      disabled={!canManage || isSaving}
                      onChange={(limit) => updateLimitDraft(group, limit)}
                    />
                  ))}
                </EuiForm>

                <EuiText size="xs" color="subdued">
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
              </>
            )}

            {!canManage && (
              <>
                <EuiSpacer />
                <EuiCallOut
                  announceOnMount
                  color="primary"
                  iconType="lock"
                  title={i18n.translate('xpack.nightshift.settings.runLimits.readOnlyTitle', {
                    defaultMessage: 'Deployment-wide privilege required',
                  })}
                >
                  <p>
                    {i18n.translate('xpack.nightshift.settings.runLimits.readOnlyDescription', {
                      defaultMessage:
                        'Changing enforcement or daily limits requires the Nightshift Manage engines privilege.',
                    })}
                  </p>
                </EuiCallOut>
              </>
            )}

            {saveError && (
              <>
                <EuiSpacer />
                <EuiCallOut
                  announceOnMount
                  color="danger"
                  iconType="error"
                  title={i18n.translate('xpack.nightshift.settings.runLimits.saveErrorTitle', {
                    defaultMessage: 'Could not save daily run limits',
                  })}
                >
                  <p>
                    {i18n.translate('xpack.nightshift.settings.runLimits.saveErrorDescription', {
                      defaultMessage:
                        'Your changes were kept. Review them and try again. Error: {error}',
                      values: { error: saveError.message },
                    })}
                  </p>
                  <EuiButton
                    data-test-subj="nightshiftRunLimitsSectionTryAgainButton"
                    color="danger"
                    size="s"
                    onClick={handleSave}
                  >
                    {i18n.translate('xpack.nightshift.settings.runLimits.saveRetryButtonLabel', {
                      defaultMessage: 'Try again',
                    })}
                  </EuiButton>
                </EuiCallOut>
              </>
            )}

            {isDirty && (
              <>
                <EuiSpacer />
                <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="nightshiftRunLimitsSectionCancelButton"
                      onClick={() => {
                        setDraftState(createRunQuotaDraftState(response));
                        setSaveError(undefined);
                      }}
                      isDisabled={isSaving}
                    >
                      {i18n.translate('xpack.nightshift.settings.runLimits.cancelButtonLabel', {
                        defaultMessage: 'Cancel',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      fill
                      onClick={handleSave}
                      isLoading={isSaving}
                      isDisabled={!canManage || !update}
                      data-test-subj="nightshiftSaveRunLimitsButton"
                    >
                      {i18n.translate('xpack.nightshift.settings.runLimits.saveButtonLabel', {
                        defaultMessage: 'Save run limits',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
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
          onCancel={() => setShowConfirmation(false)}
          onConfirm={() => void performSave()}
          cancelButtonText={i18n.translate(
            'xpack.nightshift.settings.runLimits.confirmCancelButtonLabel',
            {
              defaultMessage: 'Keep editing',
            }
          )}
          confirmButtonText={confirmationButtonText}
          buttonColor={warnings.disabling ? 'danger' : 'warning'}
        >
          {warnings.disabling && (
            <p>
              {i18n.translate('xpack.nightshift.settings.runLimits.disableConfirmDescription', {
                defaultMessage:
                  'Finite limits will stop denying new scheduled admissions. Successfully recorded scheduled admissions will continue to be counted.',
              })}
            </p>
          )}
          {warnings.enablingExhaustedGroups.length > 0 && (
            <p>
              {i18n.translate(
                'xpack.nightshift.settings.runLimits.enableReachedConfirmDescription',
                {
                  defaultMessage:
                    'Enabling enforcement will immediately allow these reached limits to deny new scheduled admissions: {groups}.',
                  values: {
                    groups: i18n.formatList(
                      'conjunction',
                      warnings.enablingExhaustedGroups.map((group) => RUN_QUOTA_GROUP_LABELS[group])
                    ),
                  },
                }
              )}
            </p>
          )}
          {warnings.loweringGroups.map((group) => {
            const limit = draftState.draft.limits[group];
            return isFiniteRunLimit(limit) ? (
              <p key={group}>
                {draftState.draft.enabled
                  ? i18n.translate(
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
                    )
                  : i18n.translate(
                      'xpack.nightshift.settings.runLimits.loweringDisabledGroupWarningDescription',
                      {
                        defaultMessage:
                          '{group} has {count} counted scheduled admissions today. If enforcement is enabled before {resetsAt}, the lower limit of {limit} can immediately deny new scheduled admissions.',
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
