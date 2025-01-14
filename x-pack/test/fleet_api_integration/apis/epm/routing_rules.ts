/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

const TEST_WRITE_INDEX = 'logs-routing_rules.test-test';
const TEST_REROUTE_INDEX = 'logs-routing_rules.reroute-test';

const ROUTING_RULES_PKG_NAME = 'routing_rules';
const ROUTING_RULES_PKG_VERSION = '1.0.0';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('routing rules for fleet managed datastreams', () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await fleetAndAgents.setup();
      await supertest
        .post(`/api/fleet/epm/packages/${ROUTING_RULES_PKG_NAME}/${ROUTING_RULES_PKG_VERSION}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
    });

    after(async () => {
      await supertest
        .delete(`/api/fleet/epm/packages/${ROUTING_RULES_PKG_NAME}/${ROUTING_RULES_PKG_VERSION}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');

      const res = await es.search({
        index: TEST_REROUTE_INDEX,
        ignore_unavailable: true,
      });

      for (const hit of res.hits.hits) {
        await es.delete({
          id: hit._id!,
          index: hit._index,
        });
      }
    });

    it('Should write doc correctly and apply the routing rule', async () => {
      const res = await es.index({
        index: TEST_WRITE_INDEX,
        body: {
          '@timestamp': '2020-01-01T09:09:00',
          message: 'hello',
          data_stream: {
            dataset: 'routing_rules.test',
            namespace: 'test',
            type: 'logs',
          },
        },
      });

      const resWrite = await es.get({
        id: res._id,
        index: res._index,
      });

      expect(resWrite._index.match(/logs-routing_rules.reroute-test/));
    });
  });
}
