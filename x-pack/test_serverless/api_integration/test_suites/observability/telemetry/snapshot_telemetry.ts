/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import deepmerge from 'deepmerge';
import ossRootTelemetrySchema from '@kbn/telemetry-plugin/schema/oss_root.json';
import xpackRootTelemetrySchema from '@kbn/telemetry-collection-xpack-plugin/schema/xpack_root.json';
import ossPluginsTelemetrySchema from '@kbn/telemetry-plugin/schema/oss_plugins.json';
import xpackPluginsTelemetrySchema from '@kbn/telemetry-collection-xpack-plugin/schema/xpack_plugins.json';
import { assertTelemetryPayload } from '@kbn/telemetry-tools';
import { FtrProviderContext } from '../../../ftr_provider_context';
import type { UsageStatsPayloadTestFriendly } from '../../../../../test/api_integration/services/usage_api';

export default function ({ getService }: FtrProviderContext) {
  const usageApi = getService('usageAPI');

  describe('Snapshot telemetry', function () {
    let stats: UsageStatsPayloadTestFriendly;

    before(async () => {
      const [unencryptedPayload] = await usageApi.getTelemetryStats({ unencrypted: true });
      stats = unencryptedPayload.stats;
    });

    it('should pass the schema validation (ensures BWC with Classic offering)', () => {
      const root = deepmerge(ossRootTelemetrySchema, xpackRootTelemetrySchema);
      const plugins = deepmerge(ossPluginsTelemetrySchema, xpackPluginsTelemetrySchema);

      try {
        assertTelemetryPayload({ root, plugins }, stats);
      } catch (err) {
        err.message = `The telemetry schemas in are out-of-date. Please define the schema of your collector and run "node scripts/telemetry_check --fix" to update them: ${err.message}`;
        throw err;
      }
    });

    it('includes the serverless info in the body', async () => {
      const [unencryptedPayload] = await usageApi.getTelemetryStats({ unencrypted: true });

      expect(
        unencryptedPayload.stats.stack_stats.kibana?.plugins?.telemetry?.labels?.serverless
      ).toBe('observability');
    });
  });
}
