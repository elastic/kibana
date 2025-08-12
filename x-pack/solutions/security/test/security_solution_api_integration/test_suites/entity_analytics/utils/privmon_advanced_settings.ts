/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENABLE_PRIVILEGED_USER_MONITORING_SETTING } from '@kbn/security-solution-plugin/common/constants';
import { KbnClient } from '@kbn/test';

export const enablePrivmonSetting = async (kibanaServer: KbnClient) => {
  await kibanaServer.uiSettings.update({
    [ENABLE_PRIVILEGED_USER_MONITORING_SETTING]: true,
  });
};

export const disablePrivmonSetting = async (kibanaServer: KbnClient) => {
  await kibanaServer.uiSettings.update({
    [ENABLE_PRIVILEGED_USER_MONITORING_SETTING]: false,
  });
};
