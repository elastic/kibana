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
import type { SignificantEventsMaintenanceStatus } from '@kbn/significant-events-plugin/common';
import {
  useMaintenanceStatus,
  useSignificantEventsMaintenanceActions,
} from '../hooks/use_significant_events_maintenance';
import { SettingsSectionRow } from './settings_section';
import { useMaintenanceActivityCounts } from './use_maintenance_activity_counts';

const SECTION_TITLE = i18n.translate('xpack.nightshift.settings.maintenance.title', {
  defaultMessage: 'Detection engine activity',
});

const SECTION_DESCRIPTION = i18n.translate('xpack.nightshift.settings.maintenance.description', {
  defaultMessage:
    'Controls detection activity across all spaces, including knowledge indicator extraction, query alerting, rule creation, and significant event discovery. Existing data always persists.',
});

function MaintenanceActivityCountsSummary({
  status,
  automationCount,
  ruleCount,
}: {
  status: SignificantEventsMaintenanceStatus;
  automationCount: number;
  ruleCount: number;
}) {
  const isPaused = status.state === 'paused';
  const failureCount = status.lastSummary?.partialFailures.length ?? 0;
  const iconType = isPaused ? 'clock' : 'check';
  const iconColor = isPaused ? 'subdued' : 'success';

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="xs"
      data-test-subj="streams-settings-maintenance-paused-counts"
    >
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={iconType} color={iconColor} size="m" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            {isPaused ? (
              <EuiText color="subdued">
                <p>
                  {i18n.translate(
                    'xpack.nightshift.settings.maintenance.disabledAutomationsSummary',
                    {
                      defaultMessage:
                        '{count, plural, one {# automation disabled} other {# automations disabled}}',
                      values: { count: automationCount },
                    }
                  )}
                </p>
              </EuiText>
            ) : (
              <EuiText>
                <p>
                  {i18n.translate(
                    'xpack.nightshift.settings.maintenance.enabledAutomationsSummary',
                    {
                      defaultMessage:
                        '{count, plural, one {# automation enabled} other {# automations enabled}}',
                      values: { count: automationCount },
                    }
                  )}
                </p>
              </EuiText>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={iconType} color={iconColor} size="m" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            {isPaused ? (
              <EuiText color="subdued">
                <p>
                  {i18n.translate('xpack.nightshift.settings.maintenance.disabledRulesSummary', {
                    defaultMessage: '{count, plural, one {# rule disabled} other {# rules disabled}}',
                    values: { count: ruleCount },
                  })}
                </p>
              </EuiText>
            ) : (
              <EuiText>
                <p>
                  {i18n.translate('xpack.nightshift.settings.maintenance.enabledRulesSummary', {
                    defaultMessage: '{count, plural, one {# rule enabled} other {# rules enabled}}',
                    values: { count: ruleCount },
                  })}
                </p>
              </EuiText>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

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
  const { automationCount, ruleCount } = useMaintenanceActivityCounts(status);

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
        {statusReady && status && (
          <>
            <EuiSpacer size="m" />
            <MaintenanceActivityCountsSummary
              status={status}
              automationCount={automationCount}
              ruleCount={ruleCount}
            />
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
                  ? i18n.translate('xpack.nightshift.settings.maintenance.resumeConfirmBody', {
                      defaultMessage:
                        'This re-enables the managed workflows and alerting rules that Pause disabled, and restores scheduled discovery / continuous onboarding only if they were enabled before pause. It does not restart executions that were cancelled.',
                    })
                  : i18n.translate('xpack.nightshift.settings.maintenance.pauseConfirmBody', {
                      defaultMessage:
                        'This disables all Significant Events managed workflows, cancels their in-flight executions, and disables the alerting rules backing knowledge indicator queries. No data is deleted.',
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
