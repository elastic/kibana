/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { archives } from '../../config';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  // url parameters
  const start = encodeURIComponent('2020-06-29T06:45:00.000Z');
  const end = encodeURIComponent('2020-06-29T06:49:00.000Z');

  describe('Agent name', () => {
    describe('when data is not loaded ', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/agent_name?start=${start}&end=${end}`
        );

        expect(response.status).to.be(200);
        expect(response.body).to.eql({});
      });
    });

    describe('when data is loaded', () => {
      before(() => esArchiver.load('apm_8.0.0'));
      after(() => esArchiver.unload('apm_8.0.0'));

      const { from, to } = archives['apm_8.0.0'];

      it('returns the agent name', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/agent_name?start=${encodeURIComponent(
            from
          )}&end=${encodeURIComponent(to)}`
        );

        expect(response.status).to.be(200);
        expect(response.body).to.eql({ agentName: 'nodejs' });
      });
    });
  });
}
