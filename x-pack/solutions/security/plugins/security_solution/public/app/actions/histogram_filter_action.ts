/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFilterAction } from '@kbn/unified-search-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { StartServices } from '../../types';
import { EsqlInTimelineAction } from './constants';

export const createHistogramFilterAction = async (
  coreStart: CoreStart,
  services: StartServices
) => {
  return createFilterAction(
    services.customDataService.query.filterManager,
    services.customDataService.query.timefilter.timefilter,
    coreStart,
    EsqlInTimelineAction.VIS_FILTER_ACTION,
    EsqlInTimelineAction.VIS_FILTER_ACTION
  );
};
