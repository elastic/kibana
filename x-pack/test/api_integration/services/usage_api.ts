/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { TelemetryCollectionManagerPlugin } from '../../../../src/plugins/telemetry_collection_manager/server/plugin';

export function UsageAPIProvider({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestNoAuth = getService('supertestWithoutAuth');

  return {
    async getUsageStatsNoAuth(): Promise<undefined> {
      const { body } = await supertestNoAuth
        .get('/api/stats?extended=true')
        .set('kbn-xsrf', 'xxx')
        .expect(401);
      return body.usage;
    },

    /**
     * Public stats API: it returns the usage in camelCase format
     */
    async getUsageStats() {
      const { body } = await supertest
        .get('/api/stats?extended=true')
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      return body.usage;
    },

    /**
     * Retrieve the stats via the private telemetry API:
     * It returns the usage in as a string encrypted blob or the plain payload if `unencrypted: false`
     *
     * @param payload Request parameters to retrieve the telemetry stats
     */
    async getTelemetryStats(payload: {
      unencrypted?: boolean;
      timeRange: { min: Date; max: Date };
    }): Promise<TelemetryCollectionManagerPlugin['getStats']> {
      const { body } = await supertest
        .post('/api/telemetry/v2/clusters/_stats')
        .set('kbn-xsrf', 'xxx')
        .send(payload)
        .expect(200);
      return body;
    },
  };
}
