/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';

export const formatTimestamp = (timestamp: string, dateFormat: string): string => {
  const parsed = moment(timestamp);
  if (!parsed.isValid()) {
    return i18n.translate('xpack.nightshift.invalidTimestamp', {
      defaultMessage: 'Unknown time',
    });
  }
  return parsed.format(dateFormat);
};

export const formatShortTime = (timestamp: string): string => {
  const parsed = moment(timestamp);
  if (!parsed.isValid()) {
    return i18n.translate('xpack.nightshift.invalidTimestamp', {
      defaultMessage: 'Unknown time',
    });
  }
  return parsed.format('HH:mm');
};

export const formatTimelineTime = (timestamp: string): string => {
  const parsed = moment(timestamp);
  const now = moment();
  if (!parsed.isValid() || parsed.isSame(now, 'day')) {
    return formatShortTime(timestamp);
  }
  if (parsed.isSame(now.clone().subtract(1, 'day'), 'day')) {
    return i18n.translate('xpack.nightshift.timeline.yesterdayLabel', {
      defaultMessage: 'Yesterday, {time}',
      values: { time: formatShortTime(timestamp) },
    });
  }
  return parsed.format(parsed.isSame(now, 'year') ? 'MMM D, HH:mm' : 'MMM D, YYYY, HH:mm');
};

export const useFormatTimestamp = (): ((timestamp: string) => string) => {
  const dateFormat = useUiSetting<string>('dateFormat');

  return useMemo(() => (timestamp: string) => formatTimestamp(timestamp, dateFormat), [dateFormat]);
};
