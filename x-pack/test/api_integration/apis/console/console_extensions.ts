/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function securityTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('/api/console_extensions/text_object/*', () => {
    const username = 'kibana_user';
    const roleName = 'kibana_user';
    const password = `${username}-password`;

    beforeEach(async () => {
      await security.user.create(username, {
        password,
        roles: [roleName],
        full_name: 'a kibana user',
      });
    });

    afterEach(async () => {
      try {
        await security.user.delete(username);
      } catch (e) {
        // ignore
      }
    });

    it('get_all cannot be accessed by an anonymous user', async () => {
      await supertest
        .get('/api/console_extensions/text_objects/get_all')
        .set('kbn-xsrf', 'xxx')
        .send()
        .expect(401);
    });

    it('create cannot be accessed by an anonymous user', async () => {
      await supertest
        .post('/api/console_extensions/text_objects/create')
        .set('kbn-xsrf', 'xxx')
        .send()
        .expect(401);
    });

    it('update cannot be accessed by an anonymous user', async () => {
      await supertest
        .put('/api/console_extensions/text_objects/update')
        .set('kbn-xsrf', 'xxx')
        .send()
        .expect(401);
    });

    it('can create and update a saved object', async () => {
      const {
        body: { id },
      } = await supertest
        .post('/api/console_extensions/text_objects/create')
        .set('kbn-xsrf', 'xxx')
        .auth(username, password)
        .send({ createdAt: 123, updatedAt: 123, text: 'test' })
        .expect(200);

      await supertest
        .put('/api/console_extensions/text_objects/update')
        .set('kbn-xsrf', 'xxx')
        .auth(username, password)
        .send({ id, createdAt: 123, updatedAt: 123, text: 'test' })
        .expect(204);
    });

    it('rejects malformed data', async () => {
      await supertest
        .post('/api/console_extensions/text_objects/create')
        .set('kbn-xsrf', 'xxx')
        .auth(username, password)
        .send({ BAD: 123, updatedAt: 123, text: 'test' })
        .expect(400);

      await supertest
        .put('/api/console_extensions/text_objects/update')
        .set('kbn-xsrf', 'xxx')
        .auth(username, password)
        .send({ id: 'not a real id', BAD: 123, updatedAt: 123, text: 'test' })
        .expect(400);
    });

    it('rejects updates to non-existent objects', async () => {
      await supertest
        .put('/api/console_extensions/text_objects/update')
        .set('kbn-xsrf', 'xxx')
        .auth(username, password)
        .send({ id: 'not a real id', createdAt: 123, updatedAt: 123, text: 'test' })
        .expect(404);
    });
  });
}
