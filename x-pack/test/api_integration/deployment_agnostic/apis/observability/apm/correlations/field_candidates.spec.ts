/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { ARCHIVER_ROUTES } from '../constants/archiver';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const esArchiver = getService('esArchiver');

  const endpoint = 'GET /internal/apm/correlations/field_candidates/transactions';

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

  describe('field candidates', () => {
    describe('without data', () => {
      it('handles the empty state', async () => {
        const response = await apmApiClient.readUser({
          endpoint,
          ...getOptions(),
        });

        expect(response.status).to.be(200);
        // If the source indices are empty, there will be no field candidates
        // because of the `include_empty_fields: false` option in the query.
        expect(response.body?.fieldCandidates.length).to.be(0);
      });
    });

    describe('with data and default args', () => {
      before(async () => {
        await esArchiver.load(ARCHIVER_ROUTES['8.0.0']);
      });
      after(async () => {
        await esArchiver.unload(ARCHIVER_ROUTES['8.0.0']);
      });

      it('returns field candidates', async () => {
        const response = await apmApiClient.readUser({
          endpoint,
          ...getOptions(),
        });

        expect(response.status).to.eql(200);
        expect(response.body?.fieldCandidates.length).to.be(81);
      });
    });
  });
}
