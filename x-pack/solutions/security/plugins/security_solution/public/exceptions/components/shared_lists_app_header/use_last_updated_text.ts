/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { selectUnit } from '@formatjs/intl-utils';
import { i18n } from '@kbn/i18n';
import * as i18nStrings from './translations';

const REFRESH_INTERVAL_MS = 10_000;

interface UseLastUpdatedTextParams {
  isLoading: boolean;
  updatedAt: number;
}

/**
 * Returns the "Updated <relative time>" app header text, refreshed every 10 seconds.
 */
export const useLastUpdatedText = ({ isLoading, updatedAt }: UseLastUpdatedTextParams): string => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timerId = setInterval(() => setNow(Date.now()), REFRESH_INTERVAL_MS);
    return () => clearInterval(timerId);
  }, []);

  if (isLoading) {
    return i18nStrings.UPDATING;
  }

  const { value, unit } = selectUnit(updatedAt, now);
  const relativeTime = new Intl.RelativeTimeFormat(i18n.getLocale(), { numeric: 'auto' }).format(
    value,
    unit
  );

  return i18nStrings.LAST_UPDATED(relativeTime);
};
