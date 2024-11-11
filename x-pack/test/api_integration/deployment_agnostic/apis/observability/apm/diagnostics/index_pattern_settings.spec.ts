/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { getApmIndexTemplateNames } from '@kbn/apm-plugin/server/routes/diagnostics/helpers/get_apm_index_template_names';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const es = getService('es');
  const synthtrace = getService('synthtrace');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  describe.skip('Diagnostics: Index pattern settings', () => {
    describe('When there is no data', () => {
      before(async () => {
        // delete all APM index templates
        await es.indices.deleteIndexTemplate({
          name: Object.values(getApmIndexTemplateNames()).flat(),
        });
      });

      it('returns the built-in (non-APM) index templates`', async () => {
        const { status, body } = await apmApiClient.adminUser({
          endpoint: 'GET /internal/apm/diagnostics',
        });
        expect(status).to.be(200);

        const templateNames = body.indexTemplatesByIndexPattern.flatMap(({ indexTemplates }) => {
          return indexTemplates?.map(({ templateName }) => templateName);
        });

        expect(templateNames).to.eql(['logs', 'metrics']);
      });
    });

    describe('When data is ingested', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        const apmSynthtraceKibanaClient = synthtrace.apmSynthtraceKibanaClient;
        const latestVersion = await apmSynthtraceKibanaClient.fetchLatestApmPackageVersion();
        await apmSynthtraceKibanaClient.installApmPackage(latestVersion);

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

      it('returns APM index templates', async () => {
        const { status, body } = await apmApiClient.adminUser({
          endpoint: 'GET /internal/apm/diagnostics',
        });
        expect(status).to.be(200);

        const templateNames = body.indexTemplatesByIndexPattern.flatMap(({ indexTemplates }) => {
          return indexTemplates?.map(({ templateName }) => templateName);
        });

        expect(templateNames).to.eql([
          'logs-apm.error',
          'logs-apm.app',
          'logs',
          'metrics-apm.service_transaction.60m',
          'metrics-apm.service_destination.10m',
          'metrics-apm.transaction.1m',
          'metrics-apm.service_destination.1m',
          'metrics-apm.service_transaction.10m',
          'metrics-apm.service_transaction.1m',
          'metrics-apm.transaction.60m',
          'metrics-apm.service_destination.60m',
          'metrics-apm.service_summary.1m',
          'metrics-apm.transaction.10m',
          'metrics-apm.internal',
          'metrics-apm.service_summary.10m',
          'metrics-apm.service_summary.60m',
          'metrics-apm.app',
          'metrics',
          'traces-apm',
          'traces-apm.rum',
          'traces-apm.sampled',
        ]);
      });
    });
  });
}
