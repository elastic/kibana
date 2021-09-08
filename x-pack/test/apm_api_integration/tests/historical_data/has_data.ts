/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const archiveName = 'apm_8.0.0';

  registry.when(
    'Historical data when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(`/api/apm/has_data`);

        expect(response.status).to.be(200);
        expect(response.body.hasData).to.be(false);
      });
    }
  );

  registry.when(
    'Historical data when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns hasData: true', async () => {
        const response = await supertest.get(`/api/apm/has_data`);

        expect(response.status).to.be(200);
        expect(response.body.hasData).to.be(true);
      });
    }
  );
}
