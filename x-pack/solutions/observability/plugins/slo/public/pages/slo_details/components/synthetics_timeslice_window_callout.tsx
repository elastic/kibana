/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery } from '@kbn/react-query';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { toDurationLabel } from '../../../utils/slo/labels';

interface SyntheticsMonitor {
  schedule?: {
    number: string;
    unit: 'm' | 's';
  };
}

export function SyntheticsTimesliceWindowCallout({ slo }: { slo: SLOWithSummaryResponse }) {
  const isSyntheticsTimeslicesSlo =
    slo.indicator.type === 'sli.synthetics.availability' && slo.budgetingMethod === 'timeslices';
  const configId = slo.meta?.synthetics?.configId;
  const timesliceWindow = slo.objective.timesliceWindow;
  const schedule = useSyntheticsMonitorSchedule({
    configId,
    enabled: !slo.remote && isSyntheticsTimeslicesSlo && Boolean(timesliceWindow),
  });

  if (!timesliceWindow || !schedule) {
    return null;
  }

  const monitorIntervalInSeconds = getMonitorIntervalInSeconds(schedule);
  const timesliceWindowInSeconds = getTimesliceWindowInSeconds(timesliceWindow);

  if (
    monitorIntervalInSeconds === undefined ||
    timesliceWindowInSeconds === undefined ||
    monitorIntervalInSeconds <= timesliceWindowInSeconds
  ) {
    return null;
  }

  return (
    <KbnWarningCallout
      announceOnMount
      data-test-subj="sloSyntheticsTimesliceWindowCallout"
      title={i18n.translate('xpack.slo.sloDetails.syntheticsTimesliceWindowCallout.title', {
        defaultMessage: 'Monitor interval exceeds the timeslice window',
      })}
      text={
        <FormattedMessage
          id="xpack.slo.sloDetails.syntheticsTimesliceWindowCallout.description"
          defaultMessage="This monitor runs every {monitorInterval}, but this SLO uses a {timesliceWindow} timeslice window. Set the timeslice window to at least the monitor interval to avoid an inflated SLI and reduced burn rates."
          values={{
            monitorInterval: toMonitorIntervalLabel(schedule),
            timesliceWindow: toDurationLabel(timesliceWindow),
          }}
        />
      }
    />
  );
}

function useSyntheticsMonitorSchedule({
  configId,
  enabled,
}: {
  configId?: string;
  enabled: boolean;
}): SyntheticsMonitor['schedule'] | undefined {
  const { http } = useKibana().services;
  const { data } = useQuery({
    queryKey: ['fetchSyntheticsMonitorSchedule', configId],
    enabled: enabled && Boolean(configId),
    queryFn: async ({ signal }) => {
      try {
        return await http.get<SyntheticsMonitor>(
          `/api/synthetics/monitors/${encodeURIComponent(configId!)}`,
          { signal }
        );
      } catch {
        return undefined;
      }
    },
    refetchOnWindowFocus: false,
  });

  return data?.schedule;
}

function getMonitorIntervalInSeconds(schedule: NonNullable<SyntheticsMonitor['schedule']>) {
  const interval = Number(schedule.number);
  if (!Number.isFinite(interval) || interval <= 0) {
    return undefined;
  }

  return schedule.unit === 'm' ? interval * 60 : interval;
}

function getTimesliceWindowInSeconds(timesliceWindow: string) {
  const match = /^(\d+)(m|h)$/.exec(timesliceWindow);
  if (!match) {
    return undefined;
  }

  const [, value, unit] = match;
  const duration = Number(value);

  return unit === 'm' ? duration * 60 : duration * 60 * 60;
}

function toMonitorIntervalLabel(schedule: NonNullable<SyntheticsMonitor['schedule']>): string {
  const interval = Number(schedule.number);

  if (schedule.unit === 's') {
    return i18n.translate(
      'xpack.slo.sloDetails.syntheticsTimesliceWindowCallout.monitorIntervalSecondsDetail',
      {
        defaultMessage: '{interval, plural, one {# second} other {# seconds}}',
        values: { interval },
      }
    );
  }

  return i18n.translate(
    'xpack.slo.sloDetails.syntheticsTimesliceWindowCallout.monitorIntervalMinutesDetail',
    {
      defaultMessage: '{interval, plural, one {# minute} other {# minutes}}',
      values: { interval },
    }
  );
}
