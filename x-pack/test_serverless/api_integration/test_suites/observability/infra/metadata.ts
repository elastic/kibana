/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type {
  InfraMetadata,
  InfraMetadataRequest,
} from '@kbn/infra-plugin/common/http_api/metadata_api';
import type { RoleCredentials } from '../../../../shared/services';
import type { FtrProviderContext } from '../../../ftr_provider_context';

import { DATES, ARCHIVE_NAME } from './constants';

const timeRange = {
  from: DATES.serverlessTestingHost.min,
  to: DATES.serverlessTestingHost.max,
};

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');

  const fetchMetadata = async (
    body: InfraMetadataRequest,
    roleAuthc: RoleCredentials
  ): Promise<InfraMetadata | undefined> => {
    const response = await supertestWithoutAuth
      .post('/api/infra/metadata')
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader)
      .send(body)
      .expect(200);
    return response.body;
  };

  describe('API /infra/metadata', () => {
    let roleAuthc: RoleCredentials;
    describe('works', () => {
      describe('Host asset type', () => {
        before(async () => {
          roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
          await esArchiver.load(ARCHIVE_NAME);
        });
        after(async () => {
          await esArchiver.unload(ARCHIVE_NAME);
          await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
        });
        it('with serverless existing host', async () => {
          const metadata = await fetchMetadata(
            {
              sourceId: 'default',
              nodeId: 'serverless-host',
              nodeType: 'host',
              timeRange,
            },
            roleAuthc
          );

          if (metadata) {
            expect(metadata.features.length).to.be(4);
            expect(metadata.name).to.equal('serverless-host');
            expect(new Date(metadata.info?.timestamp ?? '')?.getTime()).to.be.above(timeRange.from);
            expect(new Date(metadata.info?.timestamp ?? '')?.getTime()).to.be.below(timeRange.to);
            expect(metadata.info?.agent).to.eql({
              ephemeral_id: '64624d22-1eeb-4267-ac92-b11a1d09c0ba',
              id: '3ce5be59-af6a-4668-8f6d-90282a3f820e',
              name: 'serverless-host',
              type: 'metricbeat',
              version: '8.5.0',
            });
            expect(metadata.info?.host).to.eql({
              hostname: 'serverless-host',
              os: {
                build: '22D68',
                family: 'darwin',
                kernel: '22.3.0',
                name: 'macOS',
                platform: 'darwin',
                type: 'macos',
                version: '13.2.1',
              },
              id: '47B6A5A5-3134-516A-831B-A9BCA597470C',
              ip: [
                'fe80::3cdd:4bff:fe37:4ce2',
                'fe80::3cdd:4bff:fe37:4ce3',
                'fe80::3cdd:4bff:fe37:4ce1',
                'fe80::bcd0:74ff:fe6e:f2d2',
                'fe80::10cb:77ec:4d5f:e2c7',
                'fd00::47e:cfa4:41d8:c1f6',
                '192.168.1.79',
                '2003:cd:373d:9600:1f:71d7:cd48:92d4',
                '2003:cd:373d:9600:98e0:7ccf:7d02:9ca',
                '2003:cd:373d:9600:58a5:f02:405:6cd8',
                '2003:cd:373d:9600:f068:9ad1:7ed4:d706',
                'fe80::1ca7:1dff:fe98:2d66',
                'fe80::1ca7:1dff:fe98:2d66',
                'fe80::564c:747a:5670:520c',
                'fe80::205d:bb00:46bf:10e1',
                'fe80::ce81:b1c:bd2c:69e',
              ],
              mac: [
                '1E-A7-1D-98-2D-66',
                '36-5D-68-05-71-00',
                '36-5D-68-05-71-04',
                '36-5D-68-05-71-08',
                '3E-DD-4B-37-4C-C1',
                '3E-DD-4B-37-4C-C2',
                '3E-DD-4B-37-4C-C3',
                '3E-DD-4B-37-4C-E1',
                '3E-DD-4B-37-4C-E2',
                '3E-DD-4B-37-4C-E3',
                'BC-D0-74-6E-F2-D2',
                'BE-D0-74-6E-F2-D2',
              ],
              name: 'serverless-host',
              architecture: 'arm64',
            });
          } else {
            throw new Error('Metadata should never be empty');
          }
        });
      });
    });
  });
}
