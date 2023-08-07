/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe.skip('delete >', () => {
    const security = getService('security');

    before(async () => {
      await security.testUser.setRoles(['slo_all']);
      await kibanaServer.importExport.load(
        'x-pack/test/observability_api_integration/fixtures/kbn_archiver/saved_objects/simple_composite_slo.json'
      );
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await kibanaServer.importExport.unload(
        'x-pack/test/observability_api_integration/fixtures/kbn_archiver/saved_objects/simple_composite_slo.json'
      );
    });

    it('returns a 404 when the composite SLO is not found', async () => {
      await supertest
        .delete(`/api/observability/composite_slos/inexistant-id`)
        .set('kbn-xsrf', 'foo')
        .expect(404)
        .then((resp) => {
          expect(resp.body.error).to.eql('Not Found');
          expect(resp.body.message).to.contain('Composite SLO [inexistant-id] not found');
        });
    });

    describe('happy path', () => {
      it('returns a 204', async () => {
        await supertest
          .delete(`/api/observability/composite_slos/b5e88480-fa77-11ed-8871-27f3f5ca40ce`)
          .set('kbn-xsrf', 'foo')
          .expect(204);
      });
    });
  });
}
