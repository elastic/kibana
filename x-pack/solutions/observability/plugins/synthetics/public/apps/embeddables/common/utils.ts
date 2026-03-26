/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonitorFilters } from '../../../../common/types';

export const areFiltersEmpty = (filters: MonitorFilters) => {
  if (!filters) {
    return true;
  }

  return (
    !filters.monitor_ids?.length &&
    !filters.projects?.length &&
    !filters.tags?.length &&
    !filters.monitor_types?.length &&
    !filters.locations?.length
  );
};
