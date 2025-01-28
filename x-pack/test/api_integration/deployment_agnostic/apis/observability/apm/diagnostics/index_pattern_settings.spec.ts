/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { uniq } from 'lodash';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  describe('Diagnostics: Index pattern settings', () => {
    describe('When data is ingested', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

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
        const apmIndexTemplatesPatterns = ['apm', 'otel'];

        const { status, body } = await apmApiClient.adminUser({
          endpoint: 'GET /internal/apm/diagnostics',
        });
        expect(status).to.be(200);

        // filtering the array for unique index templates because they get duplicated across different index patterns
        const uniqueTemplateNames = uniq(
          body.indexTemplatesByIndexPattern.flatMap(({ indexTemplates }) => {
            return indexTemplates?.map(({ templateName }) => templateName);
          })
        );

        // filter only APM releated indices
        const apmTemplateNames = uniqueTemplateNames.filter(
          (templateName) =>
            templateName.endsWith('@template') &&
            apmIndexTemplatesPatterns.some((pattern) => templateName.includes(pattern))
        );

        // sort alphabeticaly before comparing because an order is different between testing environments
        const sortedApmTemplates = apmTemplateNames.sort();

        expect(sortedApmTemplates).to.eql([
          'logs-apm.app@template',
          'logs-apm.error@template',
          'logs-otel@template',
          'metrics-apm.app@template',
          'metrics-apm.internal@template',
          'metrics-apm.service_destination.10m@template',
          'metrics-apm.service_destination.1m@template',
          'metrics-apm.service_destination.60m@template',
          'metrics-apm.service_summary.10m@template',
          'metrics-apm.service_summary.1m@template',
          'metrics-apm.service_summary.60m@template',
          'metrics-apm.service_transaction.10m@template',
          'metrics-apm.service_transaction.1m@template',
          'metrics-apm.service_transaction.60m@template',
          'metrics-apm.transaction.10m@template',
          'metrics-apm.transaction.1m@template',
          'metrics-apm.transaction.60m@template',
          'metrics-otel@template',
          'metrics-service_summary.10m.otel@template',
          'metrics-service_summary.1m.otel@template',
          'metrics-service_summary.60m.otel@template',
          'metrics-service_transaction.10m.otel@template',
          'metrics-service_transaction.1m.otel@template',
          'metrics-service_transaction.60m.otel@template',
          'metrics-transaction.10m.otel@template',
          'metrics-transaction.1m.otel@template',
          'metrics-transaction.60m.otel@template',
          'traces-apm.rum@template',
          'traces-apm.sampled@template',
          'traces-apm@template',
          'traces-otel@template',
        ]);
      });
    });
  });
}
