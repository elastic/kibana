/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus } from '@kbn/task-manager-plugin/server';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { PrivMonUtils } from './utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('entityAnalyticsApi');
  const privMonUtils = PrivMonUtils(getService);

  describe('@ess @serverless @skipInServerlessMKI Entity Privilege Monitoring Engine Schedule', () => {
    describe('schedule now', () => {
      beforeEach(async () => {
        await privMonUtils.initPrivMonEngine();
      });

      afterEach(async () => {
        await api.deleteMonitoringEngine({ query: { data: true } });
      });

      it('should return a 409 if the task is already running', async () => {
        await privMonUtils.setPrivmonTaskStatus(TaskStatus.Running);
        await privMonUtils.scheduleMonitoringEngineNow({ expectStatusCode: 409 });
      });
    });
  });
};
