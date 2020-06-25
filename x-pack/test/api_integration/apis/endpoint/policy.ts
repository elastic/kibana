/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../../ftr_provider_context';
import { deletePolicyStream } from './data_stream_helper';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  describe('Endpoint policy api', () => {
    describe('GET /api/endpoint/policy_response', () => {
      before(async () => await esArchiver.load('endpoint/policy', { useCreate: true }));

      // the endpoint uses data streams and es archiver does not support deleting them at the moment so we need
      // to do it manually
      after(async () => await deletePolicyStream(getService));

      it('should return one policy response for host', async () => {
        const expectedHostId = '4f3b9858-a96d-49d8-a326-230d7763d767';
        const { body } = await supertest
          .get(`/api/endpoint/policy_response?hostId=${expectedHostId}`)
          .send()
          .expect(200);

        expect(body.policy_response.host.id).to.eql(expectedHostId);
        expect(body.policy_response.Endpoint.policy).to.not.be(undefined);
      });

      it('should return not found if host has no policy response', async () => {
        const { body } = await supertest
          .get(`/api/endpoint/policy_response?hostId=bad_host_id`)
          .send()
          .expect(404);

        expect(body.message).to.contain('Policy Response Not Found');
      });
    });
  });
}
