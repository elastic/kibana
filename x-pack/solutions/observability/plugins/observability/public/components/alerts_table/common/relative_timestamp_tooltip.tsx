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
import { asAbsoluteDateTime, TimeUnit } from '../../../../common/utils/formatters/datetime';

interface Props {
  /**
   * timestamp in milliseconds
   */
  time: number;
  /**
   * Threshold in hours to switch from relative to absolute time display
   * If not provided, it defaults to 2 hours
   */
  relativeDisplayThreshold?: number;
  timeUnit?: TimeUnit;
}

export function RelativeTimestampTooltip({
  time,
  relativeDisplayThreshold = 24,
  timeUnit = 'milliseconds',
}: Props) {
  const duration = moment.duration(new Date().getTime() - time);
  const absoluteTimeLabel = asAbsoluteDateTime(time, timeUnit);

  const [hour, minute] = [duration.hours(), duration.minutes()];

  const relativeDisplayText =
    hour > 0 && minute === 0
      ? i18n.translate('xpack.observability.highFidelityDurationWithHours', {
          defaultMessage: '{hour, plural, one {# hour} other {# hours}} ago',
          values: { hour },
        })
      : hour > 0
      ? i18n.translate('xpack.observability.highFidelityDurationWithHoursAndMinutes', {
          defaultMessage:
            '{hour, plural, one {# hour} other {# hours}}, {minute, plural, one {# minute} other {# minutes}} ago',
          values: { hour, minute },
        })
      : i18n.translate('xpack.observability.highFidelityDuration', {
          defaultMessage: '{minute, plural, one {# minute} other {# minutes}} ago',
          values: { hour, minute },
        });

  const timeDisplay = hour >= relativeDisplayThreshold ? absoluteTimeLabel : relativeDisplayText;

  return (
    <EuiToolTip content={absoluteTimeLabel}>
      <>{timeDisplay}</>
    </EuiToolTip>
  );
}
