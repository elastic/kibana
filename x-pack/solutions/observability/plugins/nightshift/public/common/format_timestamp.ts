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

export const useFormatTimestamp = (): ((timestamp: string) => string) => {
  const dateFormat = useUiSetting<string>('dateFormat');

  return useMemo(() => (timestamp: string) => formatTimestamp(timestamp, dateFormat), [dateFormat]);
};
