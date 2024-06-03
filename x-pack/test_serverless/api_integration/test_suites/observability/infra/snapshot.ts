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
import type { RoleCredentials } from '../../../../shared/services';
import type { FtrProviderContext } from '../../../ftr_provider_context';

import { DATES, ARCHIVE_NAME } from './constants';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');

  const fetchSnapshot = async (
    body: SnapshotRequest,
    options: { roleCredentials: RoleCredentials }
  ): Promise<SnapshotNodeResponse | undefined> => {
    const response = await supertest
      .post('/api/metrics/snapshot')
      .set(svlCommonApi.getInternalRequestHeader())
      .set(options.roleCredentials.apiKeyHeader)
      .send(body)
      .expect(200);
    return response.body;
  };

  describe('API /metrics/snapshot', () => {
    let roleCredentials: RoleCredentials;

    describe('Snapshot nodes', () => {
      const { min, max } = DATES.serverlessTestingHost;
      before(async () => {
        roleCredentials = await svlUserManager.createApiKeyForRole('admin');
        return esArchiver.load(ARCHIVE_NAME);
      });
      after(async () => {
        await svlUserManager.invalidateApiKeyForRole(roleCredentials);
        return esArchiver.unload(ARCHIVE_NAME);
      });

      it('should work', async () => {
        const snapshot = await fetchSnapshot(
          {
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
          },
          { roleCredentials }
        );

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
