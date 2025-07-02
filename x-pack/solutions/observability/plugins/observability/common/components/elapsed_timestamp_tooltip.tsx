/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';
import moment from 'moment';
import { asAbsoluteDateTime, TimeUnit } from '../utils/formatters/datetime';

interface Props {
  /**
   * timestamp in milliseconds
   */
  time: number;
  timeUnit?: TimeUnit;
}

const RELATIVE_DISPLAY_THRESHOLD_HOURS = 2;

export function getElapsedTimeText(duration: moment.Duration) {
  const minutes = Math.floor(duration.asMinutes());
  if (minutes > 0) {
    return i18n.translate('xpack.observability.alertsTable.highFidelityDuration', {
      defaultMessage: '{minutes, plural, one {# minute} other {# minutes}} ago',
      values: { minutes },
    });
  }
  return i18n.translate('xpack.observability.alertsTable.highFidelityDurationRecently', {
    defaultMessage: 'a few seconds ago',
  });
}

export function ElapsedTimestampTooltip({ time }: Props) {
  const duration = moment.duration(new Date().getTime() - time);
  const absoluteTimeLabel = asAbsoluteDateTime(time, 'milliseconds');

  const timeDisplay =
    duration.asHours() > RELATIVE_DISPLAY_THRESHOLD_HOURS
      ? absoluteTimeLabel
      : getElapsedTimeText(duration);

  return (
    <EuiToolTip content={absoluteTimeLabel}>
      <>{timeDisplay}</>
    </EuiToolTip>
  );
}
