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

  const endpoint = 'POST /internal/apm/correlations/field_value_pairs/transactions';

  const getOptions = () => ({
    params: {
      body: {
        environment: 'ENVIRONMENT_ALL',
        start: '2020',
        end: '2021',
        kuery: '',
        fieldCandidates: [
          'service.version',
          'service.node.name',
          'service.framework.version',
          'service.language.version',
          'service.runtime.version',
          'kubernetes.pod.name',
          'kubernetes.pod.uid',
          'container.id',
          'source.ip',
          'client.ip',
          'host.ip',
          'service.environment',
          'process.args',
          'http.response.status_code',
        ],
      },
    },
  });

  describe('field value pairs', () => {
    describe('without data', () => {
      it('handles the empty state', async () => {
        const response = await apmApiClient.readUser({
          endpoint,
          ...getOptions(),
        });

        expect(response.status).to.be(200);
        expect(response.body?.fieldValuePairs.length).to.be(0);
      });
    });

    describe('with data and default args', () => {
      before(async () => {
        await esArchiver.load(ARCHIVER_ROUTES['8.0.0']);
      });
      after(async () => {
        await esArchiver.unload(ARCHIVER_ROUTES['8.0.0']);
      });

      it('returns field value pairs', async () => {
        const response = await apmApiClient.readUser({
          endpoint,
          ...getOptions(),
        });

        expect(response.status).to.eql(200);
        expect(response.body?.fieldValuePairs.length).to.be(124);
      });
    });
  });
}
