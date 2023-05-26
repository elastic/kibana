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

  describe('create >', () => {
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

    it('returns a 400 with invalid payload', async () => {
      await supertest
        .post(`/api/observability/composite_slos`)
        .set('kbn-xsrf', 'foo')
        .send({})
        .expect(400)
        .then((resp) => {
          expect(resp.body.error).to.eql('Bad Request');
          expect(resp.body.message).to.contain('Invalid value undefined supplied to');
        });
    });

    it('returns a 400 when the source SLOs are not found', async () => {
      await supertest
        .post(`/api/observability/composite_slos`)
        .set('kbn-xsrf', 'foo')
        .send(createCompositeSLOInput({ sources: [{ id: 'inexistant', revision: 1, weight: 1 }] }))
        .expect(400)
        .then((resp) => {
          expect(resp.body.error).to.eql('Bad Request');
          expect(resp.body.message).to.contain(
            'One or many source SLOs are not matching the specified id and revision.'
          );
        });
    });

    it("returns a 400 when the source SLOs' time window don't match", async () => {
      await supertest
        .post(`/api/observability/composite_slos`)
        .set('kbn-xsrf', 'foo')
        .send(
          createCompositeSLOInput({
            timeWindow: {
              duration: '30d',
              isRolling: true,
            },
            sources: [
              { id: 'f9072790-f97c-11ed-895c-170d13e61076', revision: 2, weight: 1 },
              { id: 'f6694b30-f97c-11ed-895c-170d13e61076', revision: 1, weight: 2 },
            ],
          })
        )
        .expect(400)
        .then((resp) => {
          expect(resp.body.error).to.eql('Bad Request');
          expect(resp.body.message).to.contain(
            'Invalid time window. Every source SLO must use the same time window as the composite.'
          );
        });
    });

    it("returns a 400 when the source SLOs' budgeting method don't match", async () => {
      await supertest
        .post(`/api/observability/composite_slos`)
        .set('kbn-xsrf', 'foo')
        .send(
          createCompositeSLOInput({
            budgetingMethod: 'timeslices',
            sources: [
              { id: 'f9072790-f97c-11ed-895c-170d13e61076', revision: 2, weight: 1 },
              { id: 'f6694b30-f97c-11ed-895c-170d13e61076', revision: 1, weight: 2 },
            ],
          })
        )
        .expect(400)
        .then((resp) => {
          expect(resp.body.error).to.eql('Bad Request');
          expect(resp.body.message).to.contain(
            'Invalid budgeting method. Every source SLO must use the same budgeting method as the composite.'
          );
        });
    });

    describe('happy path', () => {
      it('returns a 200', async () => {
        await supertest
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
          .expect(200)
          .then((resp) => {
            expect(resp.body.id).to.be.ok();
          });
      });
    });
  });
}
