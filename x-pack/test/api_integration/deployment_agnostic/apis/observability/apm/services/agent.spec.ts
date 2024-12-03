/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import archives_metadata from '../../../../../../apm_api_integration/common/fixtures/es_archiver/archives_metadata';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { ARCHIVER_ROUTES } from '../constants/archiver';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const esArchiver = getService('esArchiver');

  const archiveName = '8.0.0';
  const { start, end } = archives_metadata[archiveName];

  describe('Agent name', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/agent',
          params: {
            path: { serviceName: 'opbeans-node' },
            query: {
              start,
              end,
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body).to.eql({});
      });
    });

    describe('when data is loaded', () => {
      before(async () => {
        await esArchiver.load(ARCHIVER_ROUTES[archiveName]);
      });
      after(async () => {
        await esArchiver.unload(ARCHIVER_ROUTES[archiveName]);
      });

      it('returns the agent name', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/agent',
          params: {
            path: { serviceName: 'opbeans-node' },
            query: {
              start,
              end,
            },
          },
        });

        expect(response.status).to.be(200);

        expect(response.body).to.eql({ agentName: 'nodejs', runtimeName: 'node' });
      });
    });
  });
}
