/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { ApiLog } from '../types';

interface ApiLogValues {
  isFlyoutOpen: boolean;
  apiLog: ApiLog | null;
}

interface ApiLogActions {
  openFlyout(apiLog: ApiLog): { apiLog: ApiLog };
  closeFlyout(): void;
}

export const ApiLogLogic = kea<MakeLogicType<ApiLogValues, ApiLogActions>>({
  path: ['enterprise_search', 'app_search', 'api_log_logic'],
  actions: () => ({
    openFlyout: (apiLog) => ({ apiLog }),
    closeFlyout: true,
  }),
  reducers: () => ({
    isFlyoutOpen: [
      false,
      {
        openFlyout: () => true,
        closeFlyout: () => false,
      },
    ],
    apiLog: [
      null,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        openFlyout: (_, { apiLog }) => apiLog,
        closeFlyout: () => null,
      },
    ],
  }),
});
