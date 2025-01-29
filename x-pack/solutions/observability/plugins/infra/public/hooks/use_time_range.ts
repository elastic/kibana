/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { parseDateRange } from '../utils/datemath';

const DEFAULT_FROM_IN_MILLISECONDS = 15 * 60000;

const getDefaultTimestamps = () => {
  const now = Date.now();

  return {
    from: new Date(now - DEFAULT_FROM_IN_MILLISECONDS).toISOString(),
    to: new Date(now).toISOString(),
  };
};

export const useTimeRange = ({ rangeFrom, rangeTo }: { rangeFrom?: string; rangeTo?: string }) => {
  const parsedDateRange = useMemo(() => {
    const defaults = getDefaultTimestamps();

    if (!rangeFrom || !rangeTo) {
      return defaults;
    }

    const { from = defaults.from, to = defaults.to } = parseDateRange({
      from: rangeFrom,
      to: rangeTo,
    });

    return { from, to };
  }, [rangeFrom, rangeTo]);

  return parsedDateRange;
};
