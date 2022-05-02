/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

const defaultPack = {
  name: 'TestPack' + Date.now(),
  description: 'TestPack Description',
  enabled: true,
  policy_ids: ['123', '456'],
  queries: {
    testQuery: {
      query:
        'select u.username,' +
        '       p.pid,' +
        '       p.name,' +
        '       pos.local_address,' +
        '       pos.local_port,' +
        '       p.path,' +
        '       p.cmdline,' +
        '       pos.remote_address,' +
        '       pos.remote_port' +
        'from processes as p' +
        'join users as u' +
        '    on u.uid=p.uid' +
        'join process_open_sockets as pos' +
        '    on pos.pid=p.pid' +
        "where pos.remote_port !='0'" +
        'limit 1000;',
      interval: 600,
      platform: 'windows',
      version: '1',
    },
  },
};

const singleLineQuery =
  "select u.username,       p.pid,       p.name,       pos.local_address,       pos.local_port,       p.path,       p.cmdline,       pos.remote_address,       pos.remote_portfrom processes as pjoin users as u    on u.uid=p.uidjoin process_open_sockets as pos    on pos.pid=p.pidwhere pos.remote_port !='0'limit 1000;";

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Packs', () => {
    let id: string = '';
    describe('create route', () => {
      it('Create a pack', async () => {
        const resp = await supertest
          .post('/internal/osquery/packs')
          .set('kbn-xsrf', 'true')
          .send(defaultPack);

        expect(resp.body.attributes.queries.testQuery.query).to.be(singleLineQuery);
        id = resp.body.id;
        expect(resp.status).to.be(200);
      });
    });
    describe('update route', () => {
      it('Make sure that we get Timeline data', async () => {
        const resp = await supertest
          .put('/internal/osquery/packs/' + id)
          .set('kbn-xsrf', 'true')
          .send(defaultPack);

        expect(resp.body.id).to.be(id);
        expect(resp.body.attributes.queries.testQuery.query).to.be(singleLineQuery);
        expect(resp.status).to.be(200);
      });
    });
  });
}
