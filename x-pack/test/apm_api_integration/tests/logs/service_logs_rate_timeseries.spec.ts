/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  type ThroughputReturn =
    APIReturnType<'GET /internal/apm/services/{serviceName}/logs_rate_timeseries'>;

  async function getLogsRateTimeseries(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/services/{serviceName}/logs_rate_timeseries'>['params']
    >
  ) {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/logs_rate_timeseries',
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
    'Logs rate timeseries when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('Logs rate api', () => {
        it('handles the empty state', async () => {
          const response = await getLogsRateTimeseries();
          expect(response.status).to.be(200);
          expect(response.body.currentPeriod.length).to.be(0);
          expect(response.body.previousPeriod.length).to.be(0);
        });
      });
    }
  );
}
