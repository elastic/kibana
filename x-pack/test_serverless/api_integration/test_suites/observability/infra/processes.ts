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
import { decodeOrThrow } from '@kbn/infra-plugin/common/runtime_types';
import { kbnTestConfig, kibanaTestSuperuserServerless } from '@kbn/test';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('API /metrics/process_list', () => {
    before(() =>
      esArchiver.load('x-pack/test/functional/es_archives/infra/serverless-testing-host')
    );
    after(() =>
      esArchiver.unload('x-pack/test/functional/es_archives/infra/serverless-testing-host')
    );

    it('works', async () => {
      const username = kbnTestConfig.getUrlParts(kibanaTestSuperuserServerless).username || '';
      const password = kbnTestConfig.getUrlParts(kibanaTestSuperuserServerless).password || '';
      const response = await supertest
        .post('/api/metrics/process_list')
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo')
        .auth(username, password)
        .send(
          ProcessListAPIRequestRT.encode({
            hostTerm: {
              'host.name': 'serverless-host',
            },
            indexPattern: 'metrics-*,metricbeat-*',
            to: 1680027672002,
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
