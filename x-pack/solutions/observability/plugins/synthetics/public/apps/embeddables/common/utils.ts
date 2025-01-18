/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitorFilters } from '../monitors_overview/types';

export const areFiltersEmpty = (filters: MonitorFilters) => {
  if (!filters) {
    return true;
  }

  return (
    !filters.monitorIds?.length &&
    !filters.projects?.length &&
    !filters.tags?.length &&
    !filters.monitorTypes?.length &&
    !filters.locations?.length
  );
};
