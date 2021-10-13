/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { format } from 'url';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('legacySupertestAsApmReadUser');
  const archiveName = 'apm_8.0.0';
  const range = archives_metadata[archiveName];

  const url = format({
    pathname: `/internal/apm/latency/overall_distribution`,
    query: {
      start: range.start,
      end: range.end,
      environment: 'ENVIRONMENT_ALL',
      kuery: '',
      percentileThreshold: '95',
    },
  });

  registry.when(
    'latency overall distribution without data',
    { config: 'trial', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(url);

        expect(response.status).to.be(200);
        expect(response.body.response).to.be(undefined);
      });
    }
  );

  registry.when(
    'latency overall distribution with data and default args',
    { config: 'trial', archives: ['apm_8.0.0'] },
    () => {
      let response: any;
      before(async () => {
        response = await supertest.get(url);
      });

      it('returns successfully', () => {
        expect(response.status).to.eql(200);
      });

      it('returns overall distribution', () => {
        // This matches the values returned for the other tab's search strategy approach in `../correlations/*`.
        expect(response.body?.percentileThresholdValue).to.be(1309695.875);
        expect(response.body?.overallHistogram.length).to.be(101);
      });
    }
  );
}
