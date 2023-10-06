/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type {
  SnapshotNodeResponse,
  SnapshotRequest,
} from '@kbn/infra-plugin/common/http_api/snapshot_api';
import { kbnTestConfig, kibanaTestSuperuserServerless } from '@kbn/test';
import type { FtrProviderContext } from '../../../ftr_provider_context';

import { DATES } from './constants';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const fetchSnapshot = async (
    body: SnapshotRequest
  ): Promise<SnapshotNodeResponse | undefined> => {
    const username = kbnTestConfig.getUrlParts(kibanaTestSuperuserServerless).username || '';
    const password = kbnTestConfig.getUrlParts(kibanaTestSuperuserServerless).password || '';
    const response = await supertest
      .post('/api/metrics/snapshot')
      .set('kbn-xsrf', 'foo')
      .set('x-elastic-internal-origin', 'foo')
      .auth(username, password)
      .send(body)
      .expect(200);
    return response.body;
  };

  describe('snapshot nodes', () => {
    describe('8.0.0', () => {
      const { min, max } = DATES.serverlessTestingHost;
      before(() =>
        esArchiver.load('x-pack/test/functional/es_archives/infra/serverless_testing_host')
      );
      after(() =>
        esArchiver.unload('x-pack/test/functional/es_archives/infra/serverless_testing_host')
      );

      it('should work', async () => {
        const snapshot = await fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '10m',
          },
          metrics: [{ type: 'cpu' }],
          nodeType: 'host',
          groupBy: [],
          includeTimeseries: false,
        });

        if (!snapshot) {
          return;
        }

        expect(snapshot).to.have.property('nodes');

        const { nodes } = snapshot;
        expect(nodes.length).to.equal(1);
        if (snapshot) {
          const firstNode = nodes[0];
          expect(firstNode).to.have.property('path');
          expect(firstNode.path.length).to.equal(1);
          expect(firstNode.path[0]).to.eql({
            value: 'serverless-host',
            label: 'serverless-host',
            ip: '192.168.1.79',
            os: 'macOS',
            cloudProvider: null,
          });
        }
      });
    });
  });
}
