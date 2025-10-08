/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENABLE_PRIVILEGED_USER_MONITORING_SETTING } from '@kbn/security-solution-plugin/common/constants';
import type { KbnClient } from '@kbn/test';

export const enablePrivmonSetting = async (kibanaServer: KbnClient, space: string = 'default') => {
  await kibanaServer.uiSettings.update(
    {
      [ENABLE_PRIVILEGED_USER_MONITORING_SETTING]: true,
    },
    { space }
  );
};

export const disablePrivmonSetting = async (kibanaServer: KbnClient, space: string = 'default') => {
  await kibanaServer.uiSettings.update(
    {
      [ENABLE_PRIVILEGED_USER_MONITORING_SETTING]: false,
    },
    { space }
  );
};

export const toggleIntegrationsSyncFlag = async (kibanaServer: KbnClient, enable: boolean) => {
  await kibanaServer.uiSettings.update({
    'securitySolution:entityAnalytics:privilegeMonitoring:enableIntegrations': enable,
  });
};
