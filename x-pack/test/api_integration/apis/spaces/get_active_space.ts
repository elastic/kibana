/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const spacesService = getService('spaces');

  describe('GET /internal/spaces/_active_space', () => {
    before(async () => {
      await spacesService.create({
        id: 'foo-space',
        name: 'Foo Space',
        disabledFeatures: ['timelion'],
        color: '#AABBCC',
      });
    });

    after(async () => {
      await spacesService.delete('foo-space');
    });

    it('returns the default space', async () => {
      await supertest
        .get('/internal/spaces/_active_space')
        .set('kbn-xsrf', 'xxx')
        .expect(200, {
          id: 'default',
          name: 'Default',
          description: 'This is your default space!',
          color: '#00bfb3',
          disabledFeatures: [],
          _reserved: true,
        });
    });

    it('returns the foo space', async () => {
      await supertest
        .get('/s/foo-space/internal/spaces/_active_space')
        .set('kbn-xsrf', 'xxx')
        .expect(200, {
          id: 'foo-space',
          name: 'Foo Space',
          disabledFeatures: ['timelion'],
          color: '#AABBCC',
        });
    });

    it('returns 404 when the space is not found', async () => {
      await supertest
        .get('/s/not-found-space/internal/spaces/_active_space')
        .set('kbn-xsrf', 'xxx')
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: 'Saved object [space/not-found-space] not found',
        });
    });
  });
}
