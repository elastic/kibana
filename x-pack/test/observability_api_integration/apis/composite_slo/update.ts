/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createCompositeSLOInput } from '../../fixtures/composite_slo';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe.skip('update >', () => {
    const security = getService('security');

    before(async () => {
      await security.testUser.setRoles(['slo_all']);
      await kibanaServer.importExport.load(
        'x-pack/test/observability_api_integration/fixtures/kbn_archiver/saved_objects/slo.json'
      );
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await kibanaServer.importExport.unload(
        'x-pack/test/observability_api_integration/fixtures/kbn_archiver/saved_objects/slo.json'
      );
    });

    it('returns a 404 when not found', async () => {
      await supertest
        .put(`/api/observability/composite_slos/inexistant-id`)
        .set('kbn-xsrf', 'foo')
        .send({ name: 'updated composite slo name' })
        .expect(404)
        .then((resp) => {
          expect(resp.body.error).to.eql('Not Found');
          expect(resp.body.message).to.contain('Composite SLO [inexistant-id] not found');
        });
    });

    describe('happy path', () => {
      it('returns a 200', async () => {
        const { body } = await supertest
          .post(`/api/observability/composite_slos`)
          .set('kbn-xsrf', 'foo')
          .send(
            createCompositeSLOInput({
              sources: [
                { id: 'f9072790-f97c-11ed-895c-170d13e61076', revision: 2, weight: 1 },
                { id: 'f6694b30-f97c-11ed-895c-170d13e61076', revision: 1, weight: 2 },
              ],
            })
          )
          .expect(200);

        await supertest
          .put(`/api/observability/composite_slos/${body.id}`)
          .set('kbn-xsrf', 'foo')
          .send({ name: 'updated composite slo name 🚀' })
          .expect(200)
          .then((resp) => {
            expect(resp.body.name).to.eql('updated composite slo name 🚀');
          });
      });
    });
  });
}
