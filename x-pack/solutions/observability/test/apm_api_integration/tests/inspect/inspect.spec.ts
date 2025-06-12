/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function inspectFlagTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  const archiveName = 'apm_8.0.0';

  registry.when('Inspect feature', { config: 'trial', archives: [archiveName] }, () => {
    describe('when passing `_inspect` as query param', () => {
      describe('elasticsearch calls made with internal user should not leak internal queries', () => {
        it('for agent configs', async () => {
          const { status, body } = await apmApiClient.readUser({
            endpoint: 'GET /api/apm/settings/agent-configuration 2023-10-31',
            params: {
              query: {
                _inspect: true,
              },
            },
          });

          expect(status).to.be(200);
          expect(body._inspect?.map((res) => res.stats?.indexPattern.value)).to.eql([
            ['metrics-apm*', 'apm-*', 'metrics-*.otel-*'],
          ]);
        });
      });
    });
  });
}
