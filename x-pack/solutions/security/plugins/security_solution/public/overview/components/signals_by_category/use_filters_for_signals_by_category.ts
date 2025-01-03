/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { Filter } from '@kbn/es-query';

import { buildShowBuildingBlockFilter } from '../../../detections/components/alerts_table/default_config';

// On the Overview page, in the Detection Alert Trend, we never show
// "building block" alerts to remove noise from the Overview UI.
// https://www.elastic.co/guide/en/security/current/building-block-rule.html
const SHOW_BUILDING_BLOCK_ALERTS = false;

export const useFiltersForSignalsByCategory = (baseFilters: Filter[]) => {
  const resultingFilters = useMemo(
    () => [...baseFilters, ...buildShowBuildingBlockFilter(SHOW_BUILDING_BLOCK_ALERTS)],
    [baseFilters]
  );

  return resultingFilters;
};
