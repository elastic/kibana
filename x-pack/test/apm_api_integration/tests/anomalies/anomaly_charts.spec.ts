/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Environment } from '@kbn/apm-plugin/common/environment_rt';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { range } from 'lodash';
import moment from 'moment';
import { ApmApiError } from '../../common/apm_api_supertest';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const ml = getService('ml');
  const es = getService('es');
  const logger = getService('log');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

  const start = moment().subtract(2, 'days');
  const end = moment();
  const spikeStart = moment().subtract(8, 'hours');
  const spikeEnd = moment().subtract(6, 'hours');

  async function statusOf(p: Promise<{ status: number }>) {
    try {
      const { status } = await p;
      return status;
    } catch (err) {
      if (err instanceof ApmApiError) {
        return err.res.status;
      }
      throw err;
    }
  }

  function getAnomalyCharts(
    {
      transactionType,
      serviceName,
      environment,
    }: {
      transactionType: string;
      serviceName: string;
      environment: Environment;
    },
    user = apmApiClient.readUser
  ) {
    return user({
      endpoint: 'GET /internal/apm/services/{serviceName}/anomaly_charts',
      params: {
        path: {
          serviceName,
        },
        query: {
          start: start.toISOString(),
          end: end.toISOString(),
          transactionType,
          environment,
        },
      },
    });
  }

  registry.when(
    'fetching service anomalies with a basic license',
    { config: 'basic', archives: [] },
    function () {
      describe('should return a 501', function () {
        this.tags('skipFIPS');
        it('returns a 501', async function () {
          const status = await statusOf(
            getAnomalyCharts({
              serviceName: 'a',
              transactionType: 'request',
              environment: 'ENVIRONMENT_ALL',
            })
          );

          expect(status).to.eql(501);
        });
      });
    }
  );

  registry.when(
    'fetching service anomalies with a trial license',
    { config: 'trial', archives: [] },
    () => {
      const NORMAL_DURATION = 100;
      const NORMAL_RATE = 1;

      beforeEach(async () => {
        const serviceA = apm
          .service({ name: 'a', environment: 'production', agentName: 'java' })
          .instance('a');

        const serviceB = apm
          .service({ name: 'b', environment: 'development', agentName: 'go' })
          .instance('b');

        const events = timerange(start.valueOf(), end.valueOf())
          .interval('1m')
          .rate(1)
          .generator((timestamp) => {
            const isInSpike = timestamp >= spikeStart.valueOf() && timestamp < spikeEnd.valueOf();
            const count = isInSpike ? 4 : NORMAL_RATE;
            const duration = isInSpike ? 10000 : NORMAL_DURATION;
            const outcome = isInSpike ? 'failure' : 'success';

            return [
              ...range(0, count).flatMap((_) =>
                serviceA
                  .transaction({ transactionName: 'tx', transactionType: 'request' })
                  .timestamp(timestamp)
                  .duration(duration)
                  .outcome(outcome)
              ),
              serviceB
                .transaction({ transactionName: 'tx', transactionType: 'Worker' })
                .timestamp(timestamp)
                .duration(duration)
                .success(),
            ];
          });

        await apmSynthtraceEsClient.index(events);
      });

      afterEach(async () => {
        await cleanup();
      });

      async function cleanup() {
        await apmSynthtraceEsClient.clean();
        await ml.cleanMlIndices();
      }

      it('returns a 403 for a user without access to ML', async () => {
        expect(
          await statusOf(
            getAnomalyCharts(
              {
                serviceName: 'a',
                transactionType: 'request',
                environment: 'ENVIRONMENT_ALL',
              },
              apmApiClient.noMlAccessUser
            )
          )
        ).to.eql(403);
      });
    }
  );
}
