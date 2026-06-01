/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaServer } from '@kbn/ftr-common-functional-services';
import type { UiSettingValues } from '@kbn/kbn-client';

export const setAdvancedSettings = async (
  kibanaServer: KibanaServer,
  settings: UiSettingValues
) => {
  await kibanaServer.uiSettings.update(settings);
  await kibanaServer.uiSettings.waitForEventualCacheRefresh();
};
