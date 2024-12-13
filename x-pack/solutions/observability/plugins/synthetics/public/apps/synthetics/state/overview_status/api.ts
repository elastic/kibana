/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitorOverviewPageState } from '..';
import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import {
  FetchMonitorOverviewQueryArgs,
  OverviewStatus,
  OverviewStatusCodec,
} from '../../../../../common/runtime_types';
import { apiService } from '../../../../utils/api_service';

export function toStatusOverviewQueryArgs(
  pageState: MonitorOverviewPageState
): FetchMonitorOverviewQueryArgs {
  return {
    query: pageState.query,
    tags: pageState.tags,
    locations: pageState.locations,
    projects: pageState.projects,
    schedules: pageState.schedules,
    monitorTypes: pageState.monitorTypes,
    monitorQueryIds: pageState.monitorQueryIds,
    showFromAllSpaces: pageState.showFromAllSpaces,
    searchFields: [],
  };
}

export const fetchOverviewStatus = async ({
  pageState,
  scopeStatusByLocation,
}: {
  pageState: MonitorOverviewPageState;
  scopeStatusByLocation?: boolean;
}): Promise<OverviewStatus> => {
  const params = toStatusOverviewQueryArgs(pageState);
  return apiService.get(
    SYNTHETICS_API_URLS.OVERVIEW_STATUS,
    { ...params, scopeStatusByLocation },
    OverviewStatusCodec
  );
};
