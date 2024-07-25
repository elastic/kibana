/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  HostDetailsStrategyResponse,
  HostsQueries,
} from '@kbn/security-solution-plugin/common/search_strategy';
import { RoleCredentials } from '@kbn/test-suites-serverless/shared/services';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { hostDetailsFilebeatExpectedResult } from '../mocks/host_details';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const secureBsearch = getService('secureBsearch');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlUserManager = getService('svlUserManager');
  let roleAuthc: RoleCredentials;
  describe('Host Details', () => {
    describe('With filebeat', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/filebeat/default');
        roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/filebeat/default');
        await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      });

      const FROM = '2000-01-01T00:00:00.000Z';
      const TO = '3000-01-01T00:00:00.000Z';

      it('Make sure that we get HostDetails data', async () => {
        const { hostDetails } = await secureBsearch.send<HostDetailsStrategyResponse>({
          supertestWithoutAuth,
          apiKeyHeader: roleAuthc.apiKeyHeader,
          internalOrigin: 'Kibana',
          options: {
            factoryQueryType: HostsQueries.details,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['filebeat-*'],
            hostName: 'raspberrypi',
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });
        expect(hostDetails).to.eql(hostDetailsFilebeatExpectedResult.hostDetails);
      });
    });
  });
}
