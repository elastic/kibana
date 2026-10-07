/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import {
  EuiAccordion,
  EuiFieldNumber,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
  MAX_SIG_EVENTS_SCHEDULED_REVIEW_PASSES,
  MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
  MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES,
  MIN_SIG_EVENTS_SCHEDULED_REVIEW_PASSES,
} from '@kbn/significant-events-plugin/common';
import { SettingsSectionRow } from './settings_section';
import type { DetectionSettingsForm } from './use_detection_settings_form';

const clampNumber = (value: string, min: number, max: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return min;
  }
  return Math.min(max, Math.max(min, parsed));
};

export const ScheduledDiscoverySection = ({
  scheduledDiscovery,
  isActivityToggleDisabled,
  isActivityConfigDisabled,
  activityBlockTooltip,
  isBlocked,
}: {
  scheduledDiscovery: DetectionSettingsForm['scheduledDiscovery'];
  isActivityToggleDisabled: boolean;
  isActivityConfigDisabled: DetectionSettingsForm['isActivityConfigDisabled'];
  activityBlockTooltip?: ReactNode;
  isBlocked: boolean;
}) => (
  <SettingsSectionRow
    title={i18n.translate('xpack.nightshift.settings.scheduledDiscoveryTitle', {
      defaultMessage: 'Scheduled detection',
    })}
    description={
      <p>
        {isBlocked
          ? i18n.translate('xpack.nightshift.settings.scheduledDiscoveryPausedHelp', {
              defaultMessage:
                'Turned off while detection engine activity is paused. Resume above to restore scheduled detection if it was enabled before pause.',
            })
          : i18n.translate('xpack.nightshift.settings.scheduledDiscoveryHelp', {
              defaultMessage:
                'Run the detection process automatically in the current Kibana space.',
            })}
      </p>
    }
    data-test-subj="streams-settings-scheduled-discovery-section"
  >
    <EuiForm component="div" fullWidth>
      <EuiFormRow fullWidth>
        <EuiToolTip content={activityBlockTooltip}>
          <EuiSwitch
            data-test-subj="streams-settings-scheduled-discovery-toggle"
            label={i18n.translate('xpack.nightshift.settings.enableScheduledDiscovery', {
              defaultMessage: 'Enable scheduled discovery',
            })}
            checked={scheduledDiscovery.draft.enabled}
            onChange={(event) =>
              scheduledDiscovery.setDraft((previous) => ({
                ...previous,
                enabled: event.target.checked,
              }))
            }
            disabled={isActivityToggleDisabled}
          />
        </EuiToolTip>
      </EuiFormRow>
      {scheduledDiscovery.draft.enabled && (
        <>
          <EuiSpacer size="s" />
          <EuiAccordion
            id="nightshiftScheduledDiscoveryAdvancedSettings"
            buttonContent={i18n.translate(
              'xpack.nightshift.settings.scheduledDiscoveryAdvancedSettings',
              {
                defaultMessage: 'Advanced schedule settings',
              }
            )}
            buttonProps={{
              'data-test-subj': 'streams-settings-scheduled-discovery-advanced-settings',
            }}
            paddingSize="m"
          >
            <>
              <EuiFormRow
                fullWidth
                label={i18n.translate('xpack.nightshift.settings.detectionIntervalLabel', {
                  defaultMessage: 'Detection interval (minutes)',
                })}
                helpText={i18n.translate('xpack.nightshift.settings.detectionIntervalHelp', {
                  defaultMessage: 'How often scheduled detection runs.',
                })}
              >
                <EuiFieldNumber
                  fullWidth
                  compressed
                  data-test-subj="streams-settings-scheduled-detection-interval"
                  value={scheduledDiscovery.draft.detectionIntervalMinutes}
                  onChange={(event) =>
                    scheduledDiscovery.setDraft((previous) => ({
                      ...previous,
                      detectionIntervalMinutes: clampNumber(
                        event.target.value,
                        MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES,
                        Number.MAX_SAFE_INTEGER
                      ),
                    }))
                  }
                  min={MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES}
                  disabled={isActivityConfigDisabled(scheduledDiscovery.draft.enabled)}
                />
              </EuiFormRow>
              <EuiFormRow
                fullWidth
                label={i18n.translate('xpack.nightshift.settings.targetCoverageLabel', {
                  defaultMessage: 'Target coverage (minutes)',
                })}
                helpText={i18n.translate('xpack.nightshift.settings.targetCoverageHelp', {
                  defaultMessage:
                    'Every active rule is scanned at least once within this window. Must exceed the detection interval to spread the fleet across runs.',
                })}
              >
                <EuiFieldNumber
                  fullWidth
                  compressed
                  data-test-subj="streams-settings-scheduled-target-coverage"
                  value={scheduledDiscovery.draft.targetCoverageMinutes}
                  onChange={(event) =>
                    scheduledDiscovery.setDraft((previous) => ({
                      ...previous,
                      targetCoverageMinutes: clampNumber(
                        event.target.value,
                        MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES,
                        Number.MAX_SAFE_INTEGER
                      ),
                    }))
                  }
                  min={MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES}
                  disabled={isActivityConfigDisabled(scheduledDiscovery.draft.enabled)}
                />
              </EuiFormRow>
              <EuiFormRow
                fullWidth
                label={i18n.translate('xpack.nightshift.settings.reviewIntervalLabel', {
                  defaultMessage: 'Review interval (minutes)',
                })}
                helpText={i18n.translate('xpack.nightshift.settings.reviewIntervalHelp', {
                  defaultMessage: 'How often scheduled discovery review runs.',
                })}
              >
                <EuiFieldNumber
                  fullWidth
                  compressed
                  data-test-subj="streams-settings-scheduled-review-interval"
                  value={scheduledDiscovery.draft.reviewIntervalMinutes}
                  onChange={(event) =>
                    scheduledDiscovery.setDraft((previous) => ({
                      ...previous,
                      reviewIntervalMinutes: clampNumber(
                        event.target.value,
                        MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES,
                        Number.MAX_SAFE_INTEGER
                      ),
                    }))
                  }
                  min={MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES}
                  disabled={isActivityConfigDisabled(scheduledDiscovery.draft.enabled)}
                />
              </EuiFormRow>
              <EuiFormRow
                fullWidth
                label={i18n.translate('xpack.nightshift.settings.discoveryBatchSizeLabel', {
                  defaultMessage: 'Discovery batch size',
                })}
                helpText={i18n.translate('xpack.nightshift.settings.discoveryBatchSizeHelp', {
                  defaultMessage: 'Maximum detections sent to each scheduled discovery pass.',
                })}
              >
                <EuiFieldNumber
                  fullWidth
                  compressed
                  data-test-subj="streams-settings-scheduled-discovery-batch-size"
                  value={scheduledDiscovery.draft.discoveryBatchSize}
                  onChange={(event) =>
                    scheduledDiscovery.setDraft((previous) => ({
                      ...previous,
                      discoveryBatchSize: clampNumber(
                        event.target.value,
                        MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
                        MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE
                      ),
                    }))
                  }
                  min={MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE}
                  max={MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE}
                  disabled={isActivityConfigDisabled(scheduledDiscovery.draft.enabled)}
                />
              </EuiFormRow>
              <EuiFormRow
                fullWidth
                label={i18n.translate('xpack.nightshift.settings.maxReviewPassesLabel', {
                  defaultMessage: 'Review passes',
                })}
                helpText={i18n.translate('xpack.nightshift.settings.maxReviewPassesHelp', {
                  defaultMessage: 'Maximum discovery passes per scheduled review run.',
                })}
              >
                <EuiFieldNumber
                  fullWidth
                  compressed
                  data-test-subj="streams-settings-scheduled-max-review-passes"
                  value={scheduledDiscovery.draft.maxReviewPasses}
                  onChange={(event) =>
                    scheduledDiscovery.setDraft((previous) => ({
                      ...previous,
                      maxReviewPasses: clampNumber(
                        event.target.value,
                        MIN_SIG_EVENTS_SCHEDULED_REVIEW_PASSES,
                        MAX_SIG_EVENTS_SCHEDULED_REVIEW_PASSES
                      ),
                    }))
                  }
                  min={MIN_SIG_EVENTS_SCHEDULED_REVIEW_PASSES}
                  max={MAX_SIG_EVENTS_SCHEDULED_REVIEW_PASSES}
                  disabled={isActivityConfigDisabled(scheduledDiscovery.draft.enabled)}
                />
              </EuiFormRow>
            </>
          </EuiAccordion>
        </>
      )}
    </EuiForm>
  </SettingsSectionRow>
);
