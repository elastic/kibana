/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { EuiProgress, useEuiTheme, VISUALIZATION_COLORS } from '@elastic/eui';

import { TooltipTable, TooltipHeader, TooltipValue, TooltipContainer } from '@elastic/charts';

import { MonitorStatusTimeBin } from './monitor_status_data';
import * as labels from './labels';

export const MonitorStatusCellTooltip = ({
  timeBin,
  isLoading,
}: {
  timeBin?: MonitorStatusTimeBin;
  isLoading: boolean;
}) => {
  const { euiTheme } = useEuiTheme();

  const isAmsterdam = euiTheme.flags.hasVisColorAdjustment;

  const SUCCESS_COLOR = isAmsterdam ? VISUALIZATION_COLORS[0] : euiTheme.colors.success;
  const DANGER_COLOR = isAmsterdam
    ? VISUALIZATION_COLORS[VISUALIZATION_COLORS.length - 1]
    : euiTheme.colors.danger;
  if (!timeBin) {
    return <>{''}</>;
  }

  const startM = moment(timeBin.start);
  const endM = moment(timeBin.end);
  const startDateStr = startM.format('LL');
  const timeStartStr = startM.format('HH:mm');
  const timeEndStr = endM.format('HH:mm');
  const isDifferentDays = startM.dayOfYear() !== endM.dayOfYear();

  // If start and end days are different, show date for both of the days
  const endDateSegment = isDifferentDays ? `${endM.format('LL')} @ ` : '';
  const tooltipTitle = `${startDateStr} @ ${timeStartStr} - ${endDateSegment}${timeEndStr}`;

  const availabilityStr =
    timeBin.ups + timeBin.downs > 0
      ? `${Math.round((timeBin.ups / (timeBin.ups + timeBin.downs)) * 100)}%`
      : '-';

  // not currently used but required by current types
  const commonTooltipValuesProps = {
    isVisible: true,
    isHighlighted: false,
    seriesIdentifier: { specId: '', key: '' },
  };
  const tooltipValues: TooltipValue[] = isLoading
    ? []
    : [
        {
          color: 'transparent',
          label: labels.AVAILABILITY_LABEL,
          value: availabilityStr,
          formattedValue: availabilityStr,
          ...commonTooltipValuesProps,
        },
        {
          color: SUCCESS_COLOR,
          label: labels.COMPLETE_LABEL,
          value: timeBin.ups,
          formattedValue: `${timeBin.ups}`,
          ...commonTooltipValuesProps,
        },
        {
          color: DANGER_COLOR,
          label: labels.FAILED_LABEL,
          value: timeBin.downs,
          formattedValue: `${timeBin.downs}`,
          ...commonTooltipValuesProps,
        },
      ];

  return (
    <TooltipContainer>
      <TooltipHeader>{tooltipTitle}</TooltipHeader>
      {isLoading && <EuiProgress size="xs" />}
      <TooltipTable
        columns={[
          { type: 'color' },
          { type: 'text', cell: (t) => t.label, style: { textAlign: 'left' } },
          { type: 'number', cell: (t) => t.value, style: { textAlign: 'right' } },
        ]}
        items={tooltipValues}
      />
    </TooltipContainer>
  );
};
