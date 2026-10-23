/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { scheduleToMilli } from '../../../../../common/lib/schedule_to_time';
import {
  ConfigKey,
  isExternalSyntheticsMonitor,
  ScheduleUnit,
  type SyntheticsMonitorSchedule,
} from '../../../../../common/runtime_types';
import { useCanEditSynthetics } from '../../../../hooks/use_capabilities';
import { useSyntheticsSettingsContext } from '../../contexts';
import { useGetUrlParams } from '../../hooks';
import { formatDuration } from '../../utils/formatting';
import { useMonitorLatestPing } from './hooks/use_monitor_latest_ping';
import { useSelectedMonitor } from './hooks/use_selected_monitor';

/**
 * Warns when the latest run for the selected location took longer than the
 * configured schedule. The Synthetics service does not start the next run until
 * the previous one finishes, so overruns look like inconsistent intervals.
 */
export const MonitorScheduleOverrunCallout = () => {
  const { monitor } = useSelectedMonitor();
  const { latestPing } = useMonitorLatestPing();
  const { basePath } = useSyntheticsSettingsContext();
  const { spaceId } = useGetUrlParams();
  const canEditSynthetics = useCanEditSynthetics();

  if (!monitor || isExternalSyntheticsMonitor(monitor)) {
    return null;
  }

  const schedule = monitor[ConfigKey.SCHEDULE];
  const durationUs = latestPing?.monitor?.duration?.us;
  if (!isScheduleOverrun(durationUs, schedule)) {
    return null;
  }

  const durationLabel = formatDuration(durationUs!);
  const frequencyLabel = formatScheduleLabel(schedule);
  const editHref =
    `${basePath}/app/synthetics/edit-monitor/${monitor[ConfigKey.CONFIG_ID]}` +
    (spaceId ? `?spaceId=${spaceId}` : '');

  return (
    <>
      <KbnWarningCallout
        announceOnMount
        title={CALLOUT_TITLE}
        data-test-subj="syntheticsMonitorScheduleOverrunCallout"
        actionProps={
          canEditSynthetics
            ? {
                primary: {
                  'data-test-subj': 'syntheticsMonitorScheduleOverrunEditButton',
                  href: editHref,
                  children: EDIT_MONITOR_LABEL,
                },
              }
            : undefined
        }
      >
        <FormattedMessage
          id="xpack.synthetics.monitorDetails.scheduleOverrunCallout.description"
          defaultMessage="The last test run took {duration}, which is longer than this monitor's {frequency} schedule. The next scheduled run is skipped until the current run finishes. Increase the schedule or reduce timeouts to avoid gaps."
          values={{
            duration: <strong>{durationLabel}</strong>,
            frequency: <strong>{frequencyLabel}</strong>,
          }}
        />
      </KbnWarningCallout>
      <EuiSpacer size="m" />
    </>
  );
};

export function isScheduleOverrun(
  durationUs: number | undefined,
  schedule: SyntheticsMonitorSchedule | undefined
): boolean {
  if (durationUs == null || durationUs <= 0 || !schedule) {
    return false;
  }
  const scheduleMs = scheduleToMilli(schedule);
  if (!Number.isFinite(scheduleMs) || scheduleMs <= 0) {
    return false;
  }
  return durationUs / 1000 >= scheduleMs;
}

function formatScheduleLabel(schedule: SyntheticsMonitorSchedule): string {
  const value = parseInt(schedule.number, 10);
  switch (schedule.unit) {
    case ScheduleUnit.SECONDS:
      return i18n.translate('xpack.synthetics.monitorDetails.scheduleOverrunCallout.seconds', {
        defaultMessage: '{value} {value, plural, one {second} other {seconds}}',
        values: { value },
      });
    case ScheduleUnit.MINUTES:
      return i18n.translate('xpack.synthetics.monitorDetails.scheduleOverrunCallout.minutes', {
        defaultMessage: '{value} {value, plural, one {minute} other {minutes}}',
        values: { value },
      });
    default:
      return `${schedule.number}${schedule.unit}`;
  }
}

const CALLOUT_TITLE = i18n.translate(
  'xpack.synthetics.monitorDetails.scheduleOverrunCallout.title',
  {
    defaultMessage: 'Last run exceeded monitor schedule',
  }
);

const EDIT_MONITOR_LABEL = i18n.translate(
  'xpack.synthetics.monitorDetails.scheduleOverrunCallout.editMonitor',
  {
    defaultMessage: 'Edit monitor',
  }
);
