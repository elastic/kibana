/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { generateMobileData } from './generate_mobile_data';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const registry = getService('registry');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2023-01-01T00:00:00.000Z').getTime();
  const end = new Date('2023-01-01T00:15:00.000Z').getTime() - 1;

  async function getMobileMainStatisticsByField({
    environment = ENVIRONMENT_ALL.value,
    kuery = '',
    serviceName,
    field,
  }: {
    environment?: string;
    kuery?: string;
    serviceName: string;
    field: string;
  }) {
    return await apmApiClient
      .readUser({
        endpoint: 'GET /internal/apm/mobile-services/{serviceName}/main_statistics',
        params: {
          path: { serviceName },
          query: {
            environment,
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            kuery,
            field,
          },
        },
      })
      .then(({ body }) => body);
  }

  registry.when(
    'Mobile main statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('when no data', () => {
        it('handles empty state', async () => {
          const response = await getMobileMainStatisticsByField({
            serviceName: 'foo',
            field: 'service.version',
          });
          expect(response.mainStatistics.length).to.be(0);
        });
      });
    }
  );

  registry.when('Mobile main statistics', { config: 'basic', archives: [] }, () => {
    before(async () => {
      await generateMobileData({
        synthtraceEsClient,
        start,
        end,
      });
    });

    after(() => synthtraceEsClient.clean());

    describe('when data is loaded', () => {
      it('returns the correct data for App version', async () => {
        const response = await getMobileMainStatisticsByField({
          serviceName: 'synth-android',
          environment: 'production',
          field: 'service.version',
        });
        const fieldNames = response.mainStatistics.map((item) => item.name);
        expect(fieldNames.length).to.be.equal(3);
      });
      it('returns the correct data for Os version', async () => {
        const response = await getMobileMainStatisticsByField({
          serviceName: 'synth-android',
          environment: 'production',
          field: 'host.os.version',
        });
        const fieldNames = response.mainStatistics.map((item) => item.name);
        expect(fieldNames.length).to.be.equal(1);
      });
      it('returns the correct data for Devices', async () => {
        const response = await getMobileMainStatisticsByField({
          serviceName: 'synth-android',
          environment: 'production',
          field: 'device.model.identifier',
        });
        const fieldNames = response.mainStatistics.map((item) => item.name);
        expect(fieldNames.length).to.be.equal(3);
      });
    });
  });
}
