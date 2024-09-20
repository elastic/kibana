/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  const deletePackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  async function writeDoc() {
    await es.index({
      index: 'metrics-no_tsdb_to_tsdb.test-default',
      refresh: true,
      body: {
        data_stream: {
          dataset: 'no_tsdb_to_tsdb.test',
          namespace: 'default',
          type: 'metrics',
        },
        '@timestamp': new Date().toISOString(),
        some_field: 'test',
        some_metric_field: 1,
      },
    });
  }

  async function rollover() {
    await es.transport.request<any>(
      {
        method: 'POST',
        path: `/metrics-no_tsdb_to_tsdb.test-default/_rollover`,
      },
      { meta: true }
    );
  }

  describe('throw with is overlapping with backing index when upgrading after a rollback', () => {
    skipIfNoDockerRegistry(providerContext);
    before(async function () {
      await es.transport
        .request<any>(
          {
            method: 'DELETE',
            path: `/_data_stream/metrics-no_tsdb_to_tsdb.test-default`,
          },
          { meta: true }
        )
        .catch((err) => {
          // handle not existing
        });
    });

    it('work', async () => {
      // #### Install package no TSDB
      await supertest
        .post(`/api/fleet/epm/packages/no_tsdb_to_tsdb/0.1.0`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      // Create data stream
      await writeDoc();

      // #### Install package with TSDB
      await supertest
        .post(`/api/fleet/epm/packages/no_tsdb_to_tsdb/0.2.0`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
      // Simulate rollover on upgrade
      await rollover();

      // #### Rollback to a no TSDB version
      await supertest
        .post(`/api/fleet/epm/packages/no_tsdb_to_tsdb/0.1.0`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
      // Simulate rollover after rollback, ILM policies, ...
      await rollover();

      // #### Try to upgrade again
      // Install package with TSDB
      await supertest
        .post(`/api/fleet/epm/packages/no_tsdb_to_tsdb/0.2.0`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      // Simulate rollover on upgrade it should throw
      let errMsg: any;
      await rollover().catch((err) => {
        errMsg = err.message;
      });

      expect(errMsg).to.match(
        /illegal_argument_exception: backing index.*is overlapping with backing index/g
      );
    });
  });
}
