/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey } from '../../../../../common/constants/monitor_management';
import type { MonitorListPageState } from './models';
import { getInitialShowFromAllSpaces } from '../utils/get_initial_show_from_all_spaces';

const DEFAULT_PAGE_STATE: MonitorListPageState = {
  pageIndex: 0,
  pageSize: 10,
  sortOrder: 'asc',
  sortField: `${ConfigKey.NAME}.keyword`,
  showFromAllSpaces: getInitialShowFromAllSpaces(),
};

export function getMonitorListPageStateWithDefaults(override?: Partial<MonitorListPageState>) {
  return {
    ...DEFAULT_PAGE_STATE,
    ...(override ?? {}),
  };
}
