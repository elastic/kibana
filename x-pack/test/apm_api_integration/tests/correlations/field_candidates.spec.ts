/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const registry = getService('registry');

  const endpoint = 'GET /internal/apm/correlations/field_candidates';

  const getOptions = () => ({
    params: {
      query: {
        environment: 'ENVIRONMENT_ALL',
        start: '2020',
        end: '2021',
        kuery: '',
      },
    },
  });

  registry.when('field candidates without data', { config: 'trial', archives: [] }, () => {
    it('handles the empty state', async () => {
      const response = await apmApiClient.readUser({
        endpoint,
        ...getOptions(),
      });

      expect(response.status).to.be(200);
      expect(response.body?.fieldCandidates.length).to.be(14);
    });
  });

  registry.when(
    'field candidates with data and default args',
    { config: 'trial', archives: ['8.0.0'] },
    () => {
      it('returns field candidates', async () => {
        const response = await apmApiClient.readUser({
          endpoint,
          ...getOptions(),
        });

        expect(response.status).to.eql(200);
        expect(response.body?.fieldCandidates.length).to.be(69);
      });
    }
  );
}
