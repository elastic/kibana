/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import type { TimeRange } from '@kbn/es-query';

/** Replaces the URL time range while preserving the route and other query parameters. */
export function useTimeRangeUpdate() {
  const history = useHistory();

  const updateTimeRange = useCallback(
    (nextRange: TimeRange) => {
      const searchParams = new URLSearchParams(history.location.search);

      // Skip update if values are the same to avoid unnecessary URL changes
      // and potential infinite loops when used in subscriptions
      if (
        searchParams.get('rangeFrom') === nextRange.from &&
        searchParams.get('rangeTo') === nextRange.to
      ) {
        return;
      }

      searchParams.set('rangeFrom', nextRange.from);
      searchParams.set('rangeTo', nextRange.to);
      history.replace({
        ...history.location,
        search: searchParams.toString(),
      });
    },
    [history]
  );

  return { updateTimeRange };
}
