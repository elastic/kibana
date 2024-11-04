/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ProcessListAPIRequestRT,
  ProcessListAPIResponseRT,
} from '@kbn/infra-plugin/common/http_api/host_details/process_list';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import type { RoleCredentials } from '../../../../shared/services';

import type { FtrProviderContext } from '../../../ftr_provider_context';
import { DATES, ARCHIVE_NAME } from './constants';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');

  describe('API /metrics/process_list', () => {
    let roleAuthc: RoleCredentials;
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      await esArchiver.load(ARCHIVE_NAME);
    });
    after(async () => {
      await esArchiver.unload(ARCHIVE_NAME);
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('works', async () => {
      const response = await supertestWithoutAuth
        .post('/api/metrics/process_list')
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send(
          ProcessListAPIRequestRT.encode({
            hostTerm: {
              'host.name': 'serverless-host',
            },
            sourceId: 'default',
            to: DATES.serverlessTestingHost.max,
            sortBy: {
              name: 'cpu',
              isAscending: false,
            },
            searchFilter: [
              {
                match_all: {},
              },
            ],
          })
        )
        .expect(200);

      const { processList, summary } = decodeOrThrow(ProcessListAPIResponseRT)(response.body);

      expect(processList.length).to.be(3);
      expect(summary.total).to.be(313);
    });
  });
}
