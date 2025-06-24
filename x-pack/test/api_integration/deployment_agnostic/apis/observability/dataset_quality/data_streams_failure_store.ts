/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { log, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const synthtrace = getService('synthtrace');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const es = getService('es');

  const start = '2025-01-01T00:00:00.000Z';
  const end = '2025-01-01T00:01:00.000Z';

  const enabledDs = 'logs-synth.fs-default';
  const disabledDs = 'logs-synth.no-default';

  async function callDetails(supertestApi: any, ds: string) {
    return supertestApi
      .get(`/internal/dataset_quality/data_streams/${encodeURIComponent(ds)}/details`)
      .query({ start, end });
  }

  describe('Failure-store flag on data-streams', () => {
    let client: LogsSynthtraceEsClient;
    let supertestAdmin: any;

    before(async () => {
      client = await synthtrace.createLogsSynthtraceEsClient();

      await client.createComponentTemplate({
        name: 'logs-failure-enabled@mappings',
        dataStreamOptions: { failure_store: { enabled: true } },
      });
      await es.indices.putIndexTemplate({
        name: enabledDs,
        index_patterns: [enabledDs],
        composed_of: [
          'logs-failure-enabled@mappings',
          'logs@mappings',
          'logs@settings',
          'ecs@mappings',
        ],
        priority: 500,
        allow_auto_create: true,
        data_stream: { hidden: false },
      });

      await client.index([
        timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((ts) => log.create().timestamp(ts).dataset('synth.fs')),
        timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((ts) => log.create().timestamp(ts).dataset('synth.no')),
      ]);
      await client.refresh();

      supertestAdmin = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        useCookieHeader: true,
        withInternalHeaders: true,
      });
    });

    after(async () => {
      await es.indices.deleteIndexTemplate({ name: enabledDs });
      await client.deleteComponentTemplate('logs-failure-enabled@mappings');
      await client.clean();
    });

    it('details API reports correct hasFailureStore flag', async () => {
      const enabled = await callDetails(supertestAdmin, enabledDs);
      const disabled = await callDetails(supertestAdmin, disabledDs);
      expect(enabled.body.hasFailureStore).to.be(true);
      expect(disabled.body.hasFailureStore).to.be(false);
    });
  });
}
