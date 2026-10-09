/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { selectUnit } from '@formatjs/intl-utils';
import { i18n } from '@kbn/i18n';

import { useTimelineLastEventTime } from '../../containers/events/last_event_time';
import { useDateFormat, useTimeZone } from '../../lib/kibana';
import { getRelativePreferenceDate } from '../formatted_date/get_relative_preference_date';
import type { LastEventTimeProps } from '.';

/**
 * Same relative formatting as `FormattedRelativeTime`: pick a unit, then format with the Kibana locale.
 */
const formatRelativeDate = (date: Date): string => {
  const { value, unit } = selectUnit(date, new Date());
  return new Intl.RelativeTimeFormat(i18n.getLocale(), { numeric: 'auto' }).format(value, unit);
};

const LOADING_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.appHeader.lastEventTimeLoadingDescription',
  { defaultMessage: 'Last event: loading...' }
);

export const useLastEventTimeText = ({
  hostName,
  userName,
  indexKey,
  ip,
  indexNames,
}: LastEventTimeProps): string | undefined => {
  const dateFormat = useDateFormat();
  const timeZone = useTimeZone();
  const [loading, { lastSeen, errorMessage }] = useTimelineLastEventTime({
    indexKey,
    indexNames,
    details: { hostName, ip, userName },
  });

  if (loading) {
    return LOADING_DESCRIPTION;
  }

  if (errorMessage != null || lastSeen == null) {
    return undefined;
  }

  const preferenceDate = getRelativePreferenceDate(lastSeen);
  if (preferenceDate == null) {
    return undefined;
  }

  const { date, displayPreferenceTime } = preferenceDate;
  const formattedDate = displayPreferenceTime
    ? moment.tz(date, timeZone).format(dateFormat)
    : formatRelativeDate(date);

  return i18n.translate('xpack.securitySolution.appHeader.lastEventTimeText', {
    defaultMessage: 'Last event: {date}',
    values: { date: formattedDate },
  });
};
