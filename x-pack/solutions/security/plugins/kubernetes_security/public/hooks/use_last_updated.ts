/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getLastUpdated } from '@kbn/securitysolution-timeline-components';
import type { GlobalFilter } from '../types';

export const useLastUpdated = (globalFilter: GlobalFilter) => {
  // Only reset updated at on refresh or after globalFilter gets updated
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updatedAt = useMemo(() => Date.now(), [globalFilter]);

  return getLastUpdated({
    updatedAt: updatedAt || Date.now(),
  });
};
