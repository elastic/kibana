/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  MAINTENANCE_FEATURE_FLAG_ACTOR,
  type SignificantEventsMaintenanceStatus,
} from '@kbn/significant-events-plugin/common';
import {
  useMaintenanceStatus,
  useSignificantEventsMaintenanceActions,
} from '../hooks/use_significant_events_maintenance';
import { SettingsSectionRow } from './settings_section';

const SECTION_TITLE = i18n.translate('xpack.nightshift.settings.maintenance.title', {
  defaultMessage: 'Detection engine activity',
});

const SECTION_DESCRIPTION = i18n.translate(
  'xpack.nightshift.settings.maintenance.spaceDescription',
  {
    defaultMessage:
      'Controls detection activity in this space, including knowledge indicator extraction, query alerting, rule creation, and significant event discovery. Other spaces are not affected, and the cost estimates and run limits on this page are not scoped to this space. Existing data always persists.',
  }
);

function PausedSummary({ status }: { status: SignificantEventsMaintenanceStatus }) {
  const { updatedBy, lastSummary } = status;
  const pausedByFeatureFlag = updatedBy === MAINTENANCE_FEATURE_FLAG_ACTOR;
  const workflowsDisabled = lastSummary?.workflowsDisabled ?? 0;
  const rulesDisabled = lastSummary?.rulesDisabled ?? 0;
  const failureCount = lastSummary?.partialFailures.length ?? 0;
  const hasCounts = workflowsDisabled > 0 || rulesDisabled > 0;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="xs"
      data-test-subj="streams-settings-maintenance-paused-status"
    >
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="pause" color="warning" size="s" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs">
              <strong>
                {i18n.translate('xpack.nightshift.settings.maintenance.pausedTitle', {
                  defaultMessage: 'Detection engine is paused',
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {updatedBy && !pausedByFeatureFlag && (
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.nightshift.settings.maintenance.pausedBy"
                defaultMessage="Paused by {pausedBy}."
                values={{ pausedBy: <strong>{updatedBy}</strong> }}
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      )}

      {hasCounts && (
        <>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="check" color="success" size="s" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs">
                  <p>
                    {i18n.translate(
                      'xpack.nightshift.settings.maintenance.pausedAutomationsSummary',
                      {
                        defaultMessage:
                          '{count, plural, one {# automation paused} other {# automations paused}}',
                        values: { count: workflowsDisabled },
                      }
                    )}
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="check" color="success" size="s" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs">
                  <p>
                    {i18n.translate('xpack.nightshift.settings.maintenance.pausedRulesSummary', {
                      defaultMessage: '{count, plural, one {# rule paused} other {# rules paused}}',
                      values: { count: rulesDisabled },
                    })}
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </>
      )}

      {pausedByFeatureFlag && (
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.nightshift.settings.maintenance.pausedByFeatureFlag"
                defaultMessage="Paused automatically because Nightshift was turned off. Activity stays paused until you resume it. The alerting rules backing knowledge indicator queries were left running."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      )}

      {failureCount > 0 && (
        <EuiFlexItem>
          <EuiCallOut
            announceOnMount
            size="s"
            color="warning"
            iconType="warning"
            data-test-subj="streams-settings-maintenance-partial-failures"
            title={
              <FormattedMessage
                id="xpack.nightshift.settings.maintenance.partialFailures"
                defaultMessage="{failureCount, plural, one {# maintenance operation} other {# maintenance operations}} could not be completed. Check the Kibana server logs for details. Pause again while paused re-sweeps disable/cancel."
                values={{ failureCount }}
              />
            }
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

export function MaintenanceSection({ canManage }: { canManage: boolean }) {
  const { data: status, isLoading, isError, refetch } = useMaintenanceStatus();
  const { pause, resume, isPausing, isResuming } = useSignificantEventsMaintenanceActions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalTitleId = useGeneratedHtmlId({
    prefix: 'nightshiftDetectionEngineConfirmationTitle',
  });

  const paused = status?.state === 'paused';
  const isMutating = isPausing || isResuming;
  const statusReady = !isLoading && !isError && status !== undefined;

  const onConfirm = () => {
    setIsModalOpen(false);
    if (paused) {
      resume();
    } else {
      pause();
    }
  };

  return (
    <>
      <SettingsSectionRow
        title={SECTION_TITLE}
        description={<p>{SECTION_DESCRIPTION}</p>}
        data-test-subj="streams-settings-maintenance-section"
      >
        {isError && (
          <>
            <EuiCallOut
              announceOnMount
              size="s"
              color="danger"
              iconType="error"
              data-test-subj="streams-settings-maintenance-status-error"
              title={i18n.translate('xpack.nightshift.settings.maintenance.statusErrorTitle', {
                defaultMessage: 'Could not load maintenance status',
              })}
            >
              <p>
                {i18n.translate('xpack.nightshift.settings.maintenance.statusErrorBody', {
                  defaultMessage:
                    'Pause and Resume are unavailable until status can be loaded. Activity controls stay disabled while status is unknown.',
                })}
              </p>
              <EuiButton
                size="s"
                onClick={() => refetch()}
                data-test-subj="streams-settings-maintenance-status-retry"
              >
                {i18n.translate('xpack.nightshift.settings.maintenance.statusRetry', {
                  defaultMessage: 'Retry',
                })}
              </EuiButton>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}
        {status?.featureSettingsUnavailable && (
          <>
            <EuiCallOut
              announceOnMount
              size="s"
              color="warning"
              iconType="warning"
              data-test-subj="streams-settings-maintenance-feature-settings-unavailable"
              title={i18n.translate(
                'xpack.nightshift.settings.maintenance.featureSettingsUnavailableTitle',
                { defaultMessage: 'Some activity settings could not be loaded' }
              )}
            >
              <p>
                {i18n.translate(
                  'xpack.nightshift.settings.maintenance.featureSettingsUnavailableBody',
                  {
                    defaultMessage:
                      'Scheduled discovery and continuous onboarding status may be incomplete. Pause and Resume still work; refresh or retry if those toggles look wrong.',
                  }
                )}
              </p>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}
        {!canManage && statusReady && (
          <>
            <EuiCallOut
              announceOnMount
              size="s"
              color="primary"
              iconType="lock"
              data-test-subj="streams-settings-maintenance-no-manage"
              title={i18n.translate('xpack.nightshift.settings.maintenance.noManageTitle', {
                defaultMessage: 'Administrator access required',
              })}
            >
              <p>
                {i18n.translate('xpack.nightshift.settings.maintenance.noManageBody', {
                  defaultMessage:
                    'You can view pause status, but pausing or resuming requires the Nightshift Manage engines privilege.',
                })}
              </p>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}
        <EuiFlexGroup responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="streams-settings-maintenance-toggle-button"
              size="s"
              color={paused ? 'primary' : 'warning'}
              iconType={paused ? 'play' : 'pause'}
              isLoading={isMutating || isLoading}
              isDisabled={!canManage || !statusReady || isMutating}
              onClick={() => setIsModalOpen(true)}
            >
              {isLoading
                ? i18n.translate('xpack.nightshift.settings.maintenance.loadingButton', {
                    defaultMessage: 'Checking status…',
                  })
                : paused
                ? i18n.translate('xpack.nightshift.settings.maintenance.resumeButton', {
                    defaultMessage: 'Resume detection engine',
                  })
                : i18n.translate('xpack.nightshift.settings.maintenance.pauseButton', {
                    defaultMessage: 'Pause detection engine',
                  })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        {paused && status && (
          <>
            <EuiSpacer size="s" />
            <PausedSummary status={status} />
          </>
        )}
      </SettingsSectionRow>

      {isModalOpen && statusReady && (
        <EuiModal
          data-test-subj="streams-settings-maintenance-confirm-modal"
          aria-labelledby={modalTitleId}
          role="alertdialog"
          initialFocus="[data-test-subj='streams-settings-maintenance-confirm-button']"
          onClose={() => setIsModalOpen(false)}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id={modalTitleId}>
              {paused
                ? i18n.translate('xpack.nightshift.settings.maintenance.resumeConfirmTitle', {
                    defaultMessage: 'Resume detection engine?',
                  })
                : i18n.translate('xpack.nightshift.settings.maintenance.pauseConfirmTitle', {
                    defaultMessage: 'Pause detection engine?',
                  })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiText>
              <p>
                {paused
                  ? i18n.translate('xpack.nightshift.settings.maintenance.spaceResumeConfirmBody', {
                      defaultMessage:
                        'This re-enables the workflows and alerting rules that Pause disabled in this space, and restores scheduled discovery / continuous onboarding only if they were enabled before pause. It does not restart executions that were cancelled. Other spaces are not affected.',
                    })
                  : i18n.translate('xpack.nightshift.settings.maintenance.spacePauseConfirmBody', {
                      defaultMessage:
                        'This disables the Significant Events workflows of this space, cancels their in-flight executions, and disables the alerting rules backing knowledge indicator queries in this space. Workflows shared by every space stay enabled, but their executions in this space are cancelled. Other spaces keep running. No data is deleted.',
                    })}
              </p>
            </EuiText>
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty
              data-test-subj="streams-settings-maintenance-confirm-cancel"
              onClick={() => setIsModalOpen(false)}
            >
              {i18n.translate('xpack.nightshift.settings.maintenance.confirmCancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
            <EuiButton
              fill
              color={paused ? 'primary' : 'warning'}
              iconType={paused ? 'play' : 'pause'}
              data-test-subj="streams-settings-maintenance-confirm-button"
              onClick={onConfirm}
            >
              {paused
                ? i18n.translate('xpack.nightshift.settings.maintenance.resumeConfirmButton', {
                    defaultMessage: 'Resume',
                  })
                : i18n.translate('xpack.nightshift.settings.maintenance.pauseConfirmButton', {
                    defaultMessage: 'Pause',
                  })}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
}
