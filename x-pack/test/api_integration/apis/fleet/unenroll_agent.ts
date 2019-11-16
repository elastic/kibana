/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('fleet_unenroll_agent', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should not allow both ids and kuery in the payload', async () => {
      await supertest
        .post(`/api/fleet/agents/unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          ids: ['agent:1'],
          kuery: ['agents.id:1'],
        })
        .expect(400);
    });

    it('should not allow no ids or kuery in the payload', async () => {
      await supertest
        .post(`/api/fleet/agents/unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({})
        .expect(400);
    });

    it('allow to unenroll using a list of ids', async () => {
      const { body } = await supertest
        .post(`/api/fleet/agents/unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          ids: ['agent1'],
        })
        .expect(200);

      expect(body).to.have.keys('results', 'success');
      expect(body.success).to.be(true);
      expect(body.results).to.have.length(1);
      expect(body.results[0].success).to.be(true);
    });

    it('allow to unenroll using a kibana query', async () => {
      const { body } = await supertest
        .post(`/api/fleet/agents/unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          kuery: 'agents.shared_id:agent2_filebeat OR agents.shared_id:agent3_metricbeat',
        })
        .expect(200);

      expect(body).to.have.keys('results', 'success');
      expect(body.success).to.be(true);
      expect(body.results).to.have.length(2);
      expect(body.results[0].success).to.be(true);

      const agentsUnenrolledIds = body.results.map((r: { id: string }) => r.id);

      expect(agentsUnenrolledIds).to.contain('agent2');
      expect(agentsUnenrolledIds).to.contain('agent3');
    });
  });
}
