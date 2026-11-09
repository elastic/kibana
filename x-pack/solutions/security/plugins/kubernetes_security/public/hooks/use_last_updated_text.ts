/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { selectUnit } from '@formatjs/intl-utils';
import { i18n } from '@kbn/i18n';
import { LAST_UPDATED } from '../../common/translations';
import type { GlobalFilter } from '../types';

const REFRESH_INTERVAL_MS = 10_000;

/**
 * Returns the "Updated <relative time>" app header text, refreshed every 10 seconds.
 */
export const useLastUpdatedText = (globalFilter: GlobalFilter): string => {
  const [, forceRender] = useState(0);

  // Only reset updated at on refresh or after globalFilter gets updated
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updatedAt = useMemo(() => Date.now(), [globalFilter]);

  useEffect(() => {
    const timerId = setInterval(() => forceRender((tick) => tick + 1), REFRESH_INTERVAL_MS);
    return () => clearInterval(timerId);
  }, []);

  const { value, unit } = selectUnit(updatedAt, Date.now());
  const relativeTime = new Intl.RelativeTimeFormat(i18n.getLocale(), { numeric: 'auto' }).format(
    value,
    unit
  );

  return LAST_UPDATED(relativeTime);
};
