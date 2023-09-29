/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { first } from 'lodash';

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
    body: SnapshotRequest,
    expectedStatusCode = 200
  ): Promise<SnapshotNodeResponse | undefined> => {
    const username = kbnTestConfig.getUrlParts(kibanaTestSuperuserServerless).username || '';
    const password = kbnTestConfig.getUrlParts(kibanaTestSuperuserServerless).password || '';
    const response = await supertest
      .post('/api/metrics/snapshot')
      .set('kbn-xsrf', 'foo')
      .set('x-elastic-internal-origin', 'foo')
      .auth(username, password)
      .send(body)
      .expect(expectedStatusCode);
    return response.body;
  };

  describe('snapshot nodes', () => {
    describe('8.0.0', () => {
      const { min, max } = DATES.logs_and_metrics;
      before(() =>
        esArchiver.load('x-pack/test/functional/es_archives/infra/8.0.0/logs_and_metrics')
      );
      after(() =>
        esArchiver.unload('x-pack/test/functional/es_archives/infra/8.0.0/logs_and_metrics')
      );

      it('should work', async () => {
        const snapshot = await fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
          },
          metrics: [{ type: 'cpu' }],
          nodeType: 'container',
          groupBy: [],
          includeTimeseries: false,
        });

        if (!snapshot) {
          return;
        }

        expect(snapshot).to.have.property('nodes');

        const { nodes } = snapshot;
        expect(nodes.length).to.equal(135);
        if (snapshot) {
          const firstNode = first(nodes) as any;
          expect(firstNode).to.have.property('path');
          expect(firstNode.path.length).to.equal(1);
          expect(first(firstNode.path)).to.have.property(
            'value',
            '01078c21eef4194b0b96253c7c6c32796aba66e3f3f37e26ac97d1dff3e2e91a'
          );
          expect(first(firstNode.path)).to.have.property(
            'label',
            'k8s_prometheus-to-sd-exporter_fluentd-gcp-v3.2.0-wcmm4_kube-system_b214d17a-9ae0-11e9-9a96-42010a84004d_0'
          );
          expect(firstNode.metrics).to.eql([{ name: 'cpu', value: 0, max: 0, avg: 0 }]);
        }
      });
    });
  });
}
