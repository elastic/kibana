/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ALLOWED_SCHEDULES_IN_MINUTES,
  ALLOWED_SCHEDULES_IN_SECONDS,
} from '../../../../../../../common/constants/monitor_defaults';
import type {
  EncryptedSyntheticsSavedMonitor,
  SyntheticsMonitorSchedule,
} from '../../../../../../../common/runtime_types';
import {
  ConfigKey,
  MonitorTypeEnum,
  ScheduleUnit,
} from '../../../../../../../common/runtime_types';
import { splitMonitorsForBulkEdit } from './bulk_edit_eligibility';
import { useGetUrlParams } from '../../../../hooks';
import { fetchBulkUpdateMonitors } from '../../../../state';
import { kibanaService } from '../../../../../../utils/kibana_service';

// UI value carries the unit inline ('10s' for seconds, '3' for minutes) so a
// single EuiSelect can express both; converted to `{ number, unit }` on save,
// matching `formatSchedule` in the add/edit form.
const toSchedule = (uiValue: string): SyntheticsMonitorSchedule => {
  const isSeconds = uiValue.endsWith('s');
  return {
    number: isSeconds ? uiValue.slice(0, -1) : uiValue,
    unit: isSeconds ? ScheduleUnit.SECONDS : ScheduleUnit.MINUTES,
  };
};

const scheduleContent = (value: number, seconds?: boolean) => {
  if (seconds) {
    return i18n.translate('xpack.synthetics.bulkScheduleFlyout.seconds.label', {
      defaultMessage: 'Every {value, number} {value, plural, one {second} other {seconds}}',
      values: { value },
    });
  }
  if (value > 60) {
    return i18n.translate('xpack.synthetics.bulkScheduleFlyout.hours.label', {
      defaultMessage: 'Every {value, number} {value, plural, one {hour} other {hours}}',
      values: { value: value / 60 },
    });
  }
  return i18n.translate('xpack.synthetics.bulkScheduleFlyout.minutes.label', {
    defaultMessage: 'Every {value, number} {value, plural, one {minute} other {minutes}}',
    values: { value },
  });
};

export const BulkScheduleFlyout = ({
  monitors,
  onClose,
  reloadPage,
}: {
  monitors: EncryptedSyntheticsSavedMonitor[];
  onClose: () => void;
  reloadPage: () => void;
}) => {
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { spaceId } = useGetUrlParams();
  const flyoutTitleId = useGeneratedHtmlId();
  const skippedAccordionId = useGeneratedHtmlId();

  const { eligibleMonitors, skippedMonitors } = useMemo(
    () => splitMonitorsForBulkEdit(monitors),
    [monitors]
  );

  // Sub-minute schedules are only valid for lightweight monitors (http/tcp/icmp).
  // For a mixed selection we fall back to the most restrictive set (minutes only,
  // 1-minute floor) so we never assign an invalid schedule to a browser monitor.
  const allowSeconds = useMemo(
    () =>
      eligibleMonitors.length > 0 &&
      eligibleMonitors.every((monitor) => {
        const type = monitor[ConfigKey.MONITOR_TYPE];
        return (
          type === MonitorTypeEnum.HTTP ||
          type === MonitorTypeEnum.TCP ||
          type === MonitorTypeEnum.ICMP
        );
      }),
    [eligibleMonitors]
  );

  const options = useMemo(() => {
    const minutes = ALLOWED_SCHEDULES_IN_MINUTES.map((value) => ({
      value,
      text: scheduleContent(parseInt(value, 10)),
    }));
    if (!allowSeconds) {
      return minutes;
    }
    const seconds = ALLOWED_SCHEDULES_IN_SECONDS.map((value) => {
      const numeric = parseInt(value, 10);
      // Force an explicit `s` suffix on the option value so toSchedule() can
      // always tell seconds from minutes, even if ALLOWED_SCHEDULES_IN_SECONDS
      // ever changes to bare numbers (e.g. '10' instead of '10s').
      return { value: `${numeric}s`, text: scheduleContent(numeric, true) };
    });
    return [...seconds, ...minutes];
  }, [allowSeconds]);

  const monitorIdsToUpdate = useMemo(() => {
    if (!selectedValue) {
      return [];
    }
    const next = toSchedule(selectedValue);
    return eligibleMonitors
      .filter((monitor) => {
        const current = monitor[ConfigKey.SCHEDULE];
        return current?.number !== next.number || current?.unit !== next.unit;
      })
      .map((monitor) => monitor[ConfigKey.CONFIG_ID]);
  }, [eligibleMonitors, selectedValue]);

  const handleSave = useCallback(async () => {
    setIsUpdating(true);
    try {
      const next = toSchedule(selectedValue);
      const { result } = await fetchBulkUpdateMonitors({
        updates: monitorIdsToUpdate.map((id) => ({
          id,
          attributes: { [ConfigKey.SCHEDULE]: next },
        })),
        spaceId,
      });
      const failedCount = result.filter((entry) => !entry.updated).length;
      const updatedCount = result.length - failedCount;

      if (failedCount === 0) {
        kibanaService.toasts.addSuccess({
          title: getSuccessMessage(updatedCount),
          toastLifeTimeMs: 3000,
        });
      } else {
        kibanaService.toasts.addWarning({
          title: getPartialFailureMessage(updatedCount, failedCount),
          toastLifeTimeMs: 5000,
        });
      }
    } catch (e) {
      kibanaService.toasts.addDanger({
        title: FAILURE_MESSAGE,
        toastLifeTimeMs: 5000,
      });
    } finally {
      setIsUpdating(false);
      reloadPage();
      onClose();
    }
  }, [monitorIdsToUpdate, selectedValue, spaceId, reloadPage, onClose]);

  const saveDisabled = monitorIdsToUpdate.length === 0 || !selectedValue;

  // Live breakdown so the user can see how many monitors Save will actually
  // touch — monitors already on the chosen frequency are counted as unchanged.
  const hasSelection = Boolean(selectedValue);
  const unchangedCount = eligibleMonitors.length - monitorIdsToUpdate.length;
  const effectSummary = [
    getWillChangeSummary(monitorIdsToUpdate.length),
    unchangedCount > 0 ? getUnchangedSummary(unchangedCount) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      data-test-subj="syntheticsBulkScheduleFlyout"
      size="s"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{FLYOUT_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <p>{getDescription(eligibleMonitors.length)}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFormRow label={FREQUENCY_LABEL} fullWidth>
          <EuiSelect
            fullWidth
            options={options}
            value={selectedValue}
            hasNoInitialSelection
            onChange={(e) => setSelectedValue(e.target.value)}
            data-test-subj="syntheticsBulkScheduleSelect"
          />
        </EuiFormRow>
        {hasSelection && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued" data-test-subj="syntheticsBulkScheduleEffectSummary">
              {effectSummary}
            </EuiText>
          </>
        )}
        {!allowSeconds && eligibleMonitors.length > 0 && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              <p>{MIXED_TYPE_HINT}</p>
            </EuiText>
          </>
        )}
        {skippedMonitors.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              color="warning"
              iconType="warning"
              announceOnMount={false}
              title={i18n.translate('xpack.synthetics.bulkScheduleFlyout.skippedWarning.title', {
                defaultMessage:
                  '{count, plural, one {# monitor} other {# monitors}} will not be updated',
                values: { count: skippedMonitors.length },
              })}
            >
              <EuiText size="s">
                <p>{SKIPPED_DESCRIPTION}</p>
              </EuiText>
              <EuiAccordion id={skippedAccordionId} buttonContent={SHOW_SKIPPED_LABEL}>
                <EuiSpacer size="xs" />
                <EuiText size="s">
                  <ul>
                    {skippedMonitors.map(({ id, name }) => (
                      <li key={id}>{name}</li>
                    ))}
                  </ul>
                </EuiText>
              </EuiAccordion>
            </EuiCallOut>
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="syntheticsBulkScheduleCancel">
              {CANCEL_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleSave}
              isLoading={isUpdating}
              disabled={saveDisabled}
              data-test-subj="syntheticsBulkScheduleSave"
            >
              {SAVE_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

const getWillChangeSummary = (count: number) =>
  i18n.translate('xpack.synthetics.bulkScheduleFlyout.summary.willChange', {
    defaultMessage: '{count, plural, one {# will change} other {# will change}}',
    values: { count },
  });

const getUnchangedSummary = (count: number) =>
  i18n.translate('xpack.synthetics.bulkScheduleFlyout.summary.unchanged', {
    defaultMessage: '{count, number} unchanged',
    values: { count },
  });

const getDescription = (count: number) =>
  i18n.translate('xpack.synthetics.bulkScheduleFlyout.description', {
    defaultMessage:
      'Set a new run schedule for {count, number} selected {count, plural, one {monitor} other {monitors}}.',
    values: { count },
  });

const getSuccessMessage = (count: number) =>
  i18n.translate('xpack.synthetics.bulkScheduleFlyout.success', {
    defaultMessage: 'Schedule updated for {count, plural, one {# monitor} other {# monitors}}.',
    values: { count },
  });

const getPartialFailureMessage = (updatedCount: number, failedCount: number) =>
  i18n.translate('xpack.synthetics.bulkScheduleFlyout.partialFailure', {
    defaultMessage:
      '{updatedCount, number} updated, {failedCount, number} failed. Check that the failed monitors are editable and try again.',
    values: { updatedCount, failedCount },
  });

const FAILURE_MESSAGE = i18n.translate('xpack.synthetics.bulkScheduleFlyout.failure', {
  defaultMessage: 'Failed to update schedule. Please try again later.',
});

const FLYOUT_TITLE = i18n.translate('xpack.synthetics.bulkScheduleFlyout.title', {
  defaultMessage: 'Edit schedule',
});

const FREQUENCY_LABEL = i18n.translate('xpack.synthetics.bulkScheduleFlyout.frequencyLabel', {
  defaultMessage: 'Frequency',
});

const MIXED_TYPE_HINT = i18n.translate('xpack.synthetics.bulkScheduleFlyout.mixedTypeHint', {
  defaultMessage:
    'Sub-minute frequencies are hidden because the selection includes browser monitors, which run at most once per minute.',
});

const SKIPPED_DESCRIPTION = i18n.translate(
  'xpack.synthetics.bulkScheduleFlyout.skippedWarning.description',
  {
    defaultMessage:
      'Project and Terraform-managed monitors cannot be edited here. Update them from their source instead.',
  }
);

const SHOW_SKIPPED_LABEL = i18n.translate(
  'xpack.synthetics.bulkScheduleFlyout.skippedWarning.showIds',
  { defaultMessage: 'Show skipped monitors' }
);

const CANCEL_LABEL = i18n.translate('xpack.synthetics.bulkScheduleFlyout.cancel', {
  defaultMessage: 'Cancel',
});

const SAVE_LABEL = i18n.translate('xpack.synthetics.bulkScheduleFlyout.save', {
  defaultMessage: 'Save',
});
