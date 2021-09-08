/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SupertestReturnType } from '../../common/apm_api_supertest';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const archiveName = 'apm_8.0.0';
  const range = archives_metadata[archiveName];

  const urlConfig = {
    endpoint: `GET /api/apm/correlations/errors/overall_timeseries` as const,
    params: {
      query: {
        start: range.start,
        end: range.end,
        environment: 'ENVIRONMENT_ALL',
        kuery: '',
      },
    },
  };

  registry.when(
    'correlations errors overall without data',
    { config: 'trial', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await apmApiClient.readUser(urlConfig);

        expect(response.status).to.be(200);
        expect(response.body.overall).to.be(null);
      });
    }
  );

  registry.when(
    'correlations errors overall with data and default args',
    { config: 'trial', archives: ['apm_8.0.0'] },
    () => {
      let response: SupertestReturnType<'GET /api/apm/correlations/errors/overall_timeseries'>;

      before(async () => {
        response = await apmApiClient.readUser(urlConfig);
      });

      it('returns successfully', () => {
        expect(response.status).to.eql(200);
      });

      it('returns overall distribution', () => {
        expectSnapshot(response.body?.overall?.timeseries.length).toMatchInline(`31`);
      });
    }
  );
}
