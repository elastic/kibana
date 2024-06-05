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
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');

  const fetchSnapshot = async (
    body: SnapshotRequest,
    roleAuthc: RoleCredentials
  ): Promise<SnapshotNodeResponse | undefined> => {
    const response = await supertestWithoutAuth
      .post('/api/metrics/snapshot')
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader)
      .send(body)
      .expect(200);
    return response.body;
  };

  describe('API /metrics/snapshot', () => {
    let roleAuthc: RoleCredentials;

    describe('Snapshot nodes', () => {
      const { min, max } = DATES.serverlessTestingHost;
      before(async () => {
        roleAuthc = await svlUserManager.createApiKeyForRole('admin');
        await esArchiver.load(ARCHIVE_NAME);
      });
      after(async () => {
        await esArchiver.unload(ARCHIVE_NAME);
        await svlUserManager.invalidateApiKeyForRole(roleAuthc);
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
          roleAuthc
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
