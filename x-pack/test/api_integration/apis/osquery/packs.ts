/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const getDefaultPack = ({ policyIds = [] }: { policyIds?: string[] }) => ({
  name: 'TestPack',
  description: 'TestPack Description',
  enabled: true,
  policy_ids: policyIds,
  queries: {
    testQuery: {
      query: multiLineQuery,
      interval: 600,
      platform: 'windows',
      version: '1',
    },
  },
});

const singleLineQuery =
  "select u.username, p.pid, p.name, pos.local_address, pos.local_port, p.path, p.cmdline, pos.remote_address, pos.remote_port from processes as p join users as u on u.uid=p.uid join process_open_sockets as pos on pos.pid=p.pid where pos.remote_port !='0' limit 1000;";
const multiLineQuery = `select u.username,
       p.pid,
       p.name,
       pos.local_address,
       pos.local_port,
       p.path,
       p.cmdline,
       pos.remote_address,
       pos.remote_port
from processes as p
join users as u
    on u.uid=p.uid
join process_open_sockets as pos
    on pos.pid=p.pid
where pos.remote_port !='0'
limit 1000;`;

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  // FLAKY: https://github.com/elastic/kibana/issues/133259
  describe.skip('Packs', () => {
    let packId: string = '';
    let hostedPolicy: Record<string, any>;
    let packagePolicyId: string;
    before(async () => {
      await getService('kibanaServer').savedObjects.cleanStandardList();
      await getService('esArchiver').load(
        'x-pack/test/functional/es_archives/fleet/empty_fleet_server'
      );
    });
    after(async () => {
      await getService('kibanaServer').savedObjects.cleanStandardList();
      await getService('esArchiver').unload(
        'x-pack/test/functional/es_archives/fleet/empty_fleet_server'
      );
    });

    after(async function () {
      await supertest
        .post(`/api/fleet/agent_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ agentPolicyId: hostedPolicy.id });
    });

    it('create route should return 200 and multi line query, but single line query in packs config', async () => {
      const {
        body: { item: agentPolicy },
      } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `Hosted policy from ${Date.now()}`,
          namespace: 'default',
        });
      hostedPolicy = agentPolicy;

      const packagePolicyResponse = await supertest
        .post('/api/fleet/package_policies')
        .set('kbn-xsrf', 'true')
        .send({
          enabled: true,
          package: {
            name: 'osquery_manager',
            version: '1.2.1',
            title: 'test',
          },
          inputs: [],
          namespace: 'default',
          policy_id: hostedPolicy.id,
          name: 'TEST',
          description: '123',
          id: '123',
        });

      if (!packagePolicyResponse.body.item) {
        // eslint-disable-next-line no-console
        console.error({ MISSING: packagePolicyResponse });
      }

      expect(packagePolicyResponse.status).to.be(200);

      packagePolicyId = packagePolicyResponse.body.item.id;

      const createPackResponse = await supertest
        .post('/api/osquery/packs')
        .set('kbn-xsrf', 'true')
        .send(getDefaultPack({ policyIds: [hostedPolicy.id] }));

      packId = createPackResponse.body.data.id;
      expect(createPackResponse.status).to.be(200);

      const pack = await supertest.get('/api/osquery/packs/' + packId).set('kbn-xsrf', 'true');

      expect(pack.status).to.be(200);
      expect(pack.body.data.queries.testQuery.query).to.be(multiLineQuery);

      const {
        body: {
          item: { inputs },
        },
      } = await supertest.get(`/api/fleet/package_policies/${packagePolicyId}`);

      expect(inputs[0].config.osquery.value.packs.TestPack.queries.testQuery.query).to.be(
        singleLineQuery
      );
    });

    it('update route should return 200 and multi line query, but single line query in packs config', async () => {
      const updatePackResponse = await supertest
        .put('/api/osquery/packs/' + packId)
        .set('kbn-xsrf', 'true')
        .send(getDefaultPack({ policyIds: [hostedPolicy.id] }));

      expect(updatePackResponse.status).to.be(200);
      expect(updatePackResponse.body.data.id).to.be(packId);
      const pack = await supertest.get('/api/osquery/packs/' + packId).set('kbn-xsrf', 'true');

      expect(pack.body.data.queries.testQuery.query).to.be(multiLineQuery);
      const {
        body: {
          item: { inputs },
        },
      } = await supertest.get(`/api/fleet/package_policies/${packagePolicyId}`);

      expect(inputs[0].config.osquery.value.packs.TestPack.queries.testQuery.query).to.be(
        singleLineQuery
      );
    });
  });
}
