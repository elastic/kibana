/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { getApmIndexTemplateNames } from '@kbn/apm-plugin/server/routes/diagnostics/helpers/get_apm_index_template_names';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const es = getService('es');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');
  const synthtraceKibanaClient = getService('synthtraceKibanaClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  registry.when.skip('Diagnostics: Index Templates', { config: 'basic', archives: [] }, () => {
    describe('When there is no data', () => {
      before(async () => {
        // delete APM index templates
        await es.indices.deleteIndexTemplate({
          name: Object.values(getApmIndexTemplateNames()).flat(),
        });
      });

      it('verifies that none of the default APM index templates exists`', async () => {
        const { status, body } = await apmApiClient.adminUser({
          endpoint: 'GET /internal/apm/diagnostics',
        });
        expect(status).to.be(200);
        const noApmIndexTemplateExists = body.apmIndexTemplates.every(
          ({ exists }) => exists === false
        );
        expect(noApmIndexTemplateExists).to.eql(true);
      });
    });

    describe('When data is ingested', () => {
      before(async () => {
        const latestVersion = await synthtraceKibanaClient.fetchLatestApmPackageVersion();
        await synthtraceKibanaClient.installApmPackage(latestVersion);

        const instance = apm
          .service({ name: 'synth-go', environment: 'production', agentName: 'go' })
          .instance('instance-a');
        await apmSynthtraceEsClient.index(
          timerange(start, end)
            .interval('1m')
            .rate(30)
            .generator((timestamp) =>
              instance
                .transaction({ transactionName: 'GET /users' })
                .timestamp(timestamp)
                .duration(100)
                .success()
            )
        );
      });

      after(() => apmSynthtraceEsClient.clean());

      it('verifies that all the default APM index templates exist', async () => {
        const { status, body } = await apmApiClient.adminUser({
          endpoint: 'GET /internal/apm/diagnostics',
        });
        expect(status).to.be(200);

        const everyApmIndexTemplateExists = body.apmIndexTemplates.every(
          ({ exists }) => exists === true
        );

        expect(everyApmIndexTemplateExists).to.eql(true);
      });
    });
  });
}
