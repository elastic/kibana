/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const spacesService = getService('spaces');

  describe('PUT /api/spaces/space', () => {
    it('creates space with solution defined', async () => {
      const space = {
        id: 'my-space',
        name: 'Foo Space',
        disabledFeatures: [],
        color: '#AABBCC',
        solution: 'search',
      };

      await supertest
        .post('/api/spaces/space')
        .set('kbn-xsrf', 'xxx')
        .send(space)
        .expect(200)
        .then((response) => {
          console.log(response.body);
          // const { id, name, _reserved } = response.body;
          // expect({ id, name, _reserved }).to.eql({
          //   id: 'default',
          //   name: 'Default',
          //   _reserved: true,
          // });
        });
    });
  });
}
