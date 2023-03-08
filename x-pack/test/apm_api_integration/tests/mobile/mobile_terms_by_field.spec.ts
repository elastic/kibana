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

  async function getMobileTermsByField({
    environment = ENVIRONMENT_ALL.value,
    kuery = '',
    serviceName,
    fieldName,
    size,
  }: {
    environment?: string;
    kuery?: string;
    serviceName: string;
    fieldName: string;
    size: number;
  }) {
    return await apmApiClient
      .readUser({
        endpoint: 'GET /internal/apm/mobile-services/{serviceName}/terms',
        params: {
          path: { serviceName },
          query: {
            environment,
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            kuery,
            size,
            fieldName,
          },
        },
      })
      .then(({ body }) => body);
  }

  registry.when('Mobile terms when data is not loaded', { config: 'basic', archives: [] }, () => {
    describe('when no data', () => {
      it('handles empty state', async () => {
        const response = await getMobileTermsByField({
          serviceName: 'foo',
          fieldName: 'bar',
          size: 1,
        });
        expect(response.terms).to.eql([]);
      });

      it('handles empty fieldName', async () => {
        const response = await getMobileTermsByField({
          serviceName: 'synth-android',
          fieldName: '',
          size: 1,
        });
        expect(response.terms).to.eql([]);
      });
    });
  });

  registry.when('Mobile terms', { config: 'basic', archives: [] }, () => {
    before(async () => {
      await generateMobileData({
        synthtraceEsClient,
        start,
        end,
      });
    });

    after(() => synthtraceEsClient.clean());

    describe('when data is loaded', () => {
      it('returns mobile devices', async () => {
        const response = await getMobileTermsByField({
          serviceName: 'synth-android',
          environment: 'production',
          fieldName: 'device.model.identifier',
          size: 10,
        });
        expect(response.terms).to.eql([
          {
            label: 'SM-G973F',
            count: 6,
          },
          {
            label: 'HUAWEI P2-0000',
            count: 3,
          },
          {
            label: 'SM-G930F',
            count: 3,
          },
        ]);
      });

      it('returns mobile versions', async () => {
        const response = await getMobileTermsByField({
          serviceName: 'synth-android',
          environment: 'production',
          fieldName: 'service.version',
          size: 10,
        });
        expect(response.terms).to.eql([
          {
            label: '2.3',
            count: 6,
          },
          {
            label: '1.1',
            count: 3,
          },
          {
            label: '1.2',
            count: 3,
          },
        ]);
      });

      it('return the most used mobile version', async () => {
        const response = await getMobileTermsByField({
          serviceName: 'synth-android',
          environment: 'production',
          fieldName: 'service.version',
          size: 1,
        });
        expect(response.terms).to.eql([
          {
            label: '2.3',
            count: 6,
          },
        ]);
      });
    });
  });
}
