/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseAsync } from './use_async';
import { useAsync } from './use_async';
import { useTimeRangeContext } from './use_time_range_context';

export const useTimeRangeAsync: UseAsync = (fn, dependencies) => {
  const { timeRangeId } = useTimeRangeContext();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useAsync(fn, dependencies.concat(timeRangeId));
};
