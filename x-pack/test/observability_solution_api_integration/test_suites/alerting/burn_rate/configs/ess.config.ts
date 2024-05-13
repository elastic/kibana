/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../../../../config/ess/config.base';
import { AlertingApiProvider } from '../../../../services/alerting_api';
import { SloApiProvider } from '../../../../services/slo_api';

export default createTestConfig({
  services: {
    alertingApi: AlertingApiProvider,
    sloApi: SloApiProvider,
  },
  testFiles: [require.resolve('..')],
  junit: {
    reportName: 'SLO - Burn rate Integration Tests - ESS Env',
  },
});
