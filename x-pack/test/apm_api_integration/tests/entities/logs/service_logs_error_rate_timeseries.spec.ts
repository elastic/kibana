/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { log, timerange } from '@kbn/apm-synthtrace-client';
import { first, last } from 'lodash';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import { APIClientRequestParamsOf } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const logSynthtrace = getService('logSynthtraceEsClient');

  const serviceName = 'synth-go';
  const start = new Date('2024-01-01T00:00:00.000Z').getTime();
  const end = new Date('2024-01-01T00:15:00.000Z').getTime() - 1;

  const hostName = 'synth-host';

  async function getLogsErrorRateTimeseries(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/entities/services/{serviceName}/logs_error_rate_timeseries'>['params']
    >
  ) {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/entities/services/{serviceName}/logs_error_rate_timeseries',
      params: {
        path: {
          serviceName: 'synth-go',
          ...overrides?.path,
        },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          ...overrides?.query,
        },
      },
    });
    return response;
  }

  registry.when(
    'Logs error rate timeseries when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('Logs error rate api', () => {
        it('handles the empty state', async () => {
          const response = await getLogsErrorRateTimeseries();
          expect(response.status).to.be(200);
          expect(response.body.currentPeriod).to.empty();
        });
      });
    }
  );

  registry.when(
    'Logs error rate timeseries when data loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('Logs without log level field', () => {
        before(async () => {
          return logSynthtrace.index([
            timerange(start, end)
              .interval('1m')
              .rate(1)
              .generator((timestamp) =>
                log.create().message('This is a log message').timestamp(timestamp).defaults({
                  'log.file.path': '/my-service.log',
                  'service.name': serviceName,
                  'host.name': hostName,
                })
              ),
          ]);
        });
        after(async () => {
          await logSynthtrace.clean();
        });

        it('returns {} if log level is not available ', async () => {
          const response = await getLogsErrorRateTimeseries();
          expect(response.status).to.be(200);
        });
      });

      describe('Logs with log.level=error', () => {
        before(async () => {
          return logSynthtrace.index([
            timerange(start, end)
              .interval('1m')
              .rate(1)
              .generator((timestamp) =>
                log
                  .create()
                  .message('This is a log message')
                  .logLevel('error')
                  .timestamp(timestamp)
                  .defaults({
                    'log.file.path': '/my-service.log',
                    'service.name': serviceName,
                    'host.name': hostName,
                    'service.environment': 'test',
                  })
              ),
            timerange(start, end)
              .interval('2m')
              .rate(1)
              .generator((timestamp) =>
                log
                  .create()
                  .message('This is an error log message')
                  .logLevel('error')
                  .timestamp(timestamp)
                  .defaults({
                    'log.file.path': '/my-service.log',
                    'service.name': 'my-service',
                    'host.name': hostName,
                    'service.environment': 'production',
                  })
              ),
            timerange(start, end)
              .interval('5m')
              .rate(1)
              .generator((timestamp) =>
                log
                  .create()
                  .message('This is an info message')
                  .logLevel('info')
                  .timestamp(timestamp)
                  .defaults({
                    'log.file.path': '/my-service.log',
                    'service.name': 'my-service',
                    'host.name': hostName,
                    'service.environment': 'production',
                  })
              ),
          ]);
        });
        after(async () => {
          await logSynthtrace.clean();
        });

        it('returns log error rate timeseries', async () => {
          const response = await getLogsErrorRateTimeseries();
          expect(response.status).to.be(200);
          expect(response.body.currentPeriod[serviceName].every(({ y }) => y === 1)).to.be(true);
        });

        it('handles environment filter', async () => {
          const response = await getLogsErrorRateTimeseries({ query: { environment: 'foo' } });
          expect(response.status).to.be(200);
          expect(response.body.currentPeriod).to.empty();
        });

        describe('when my-service is selected', () => {
          it('returns some data', async () => {
            const response = await getLogsErrorRateTimeseries({
              path: { serviceName: 'my-service' },
            });

            expect(response.status).to.be(200);
            expect(first(response.body.currentPeriod?.['my-service'])?.y).to.be(1);
            expect(last(response.body.currentPeriod?.['my-service'])?.y).to.be(1);
          });
        });
      });
    }
  );
}
