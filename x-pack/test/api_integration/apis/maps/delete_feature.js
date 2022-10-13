/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('doc feature deletion', () => {
    it('should delete a valid feature document', async () => {
      await supertest
        .delete(`/api/maps/feature/999`)
        .set('kbn-xsrf', 'kibana')
        .send({
          index: 'drawing_data',
        })
        .expect(200);
    });

    it('previously deleted document no longer exists in index', async () => {
      await supertest
        .delete(`/api/maps/feature/999`)
        .set('kbn-xsrf', 'kibana')
        .send({
          index: 'drawing_data',
        })
        .expect(404);
    });

    it('should fail if not a valid document', async () => {
      await supertest
        .delete(`/api/maps/feature/998`)
        .set('kbn-xsrf', 'kibana')
        .send({
          index: 'drawing_data',
        })
        .expect(404);
    });
  });
}
