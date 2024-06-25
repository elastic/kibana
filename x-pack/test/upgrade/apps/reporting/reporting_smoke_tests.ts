/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ReportingUsageType } from '@kbn/reporting-plugin/server/usage/reporting_usage_collector';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const usageAPI = getService('usageAPI');

  describe('reporting ', () => {
    let usage: ReportingUsageType;
    describe('initial state', () => {
      before(async () => {
        const [{ stats }] = await usageAPI.getTelemetryStats({ unencrypted: true });
        usage = stats.stack_stats.kibana.plugins.reporting;
      });

      it('shows reporting as available and enabled', async () => {
        expect(usage.available).to.be(true);
        expect(usage.enabled).to.be(true);
      });
    });
  });
}
