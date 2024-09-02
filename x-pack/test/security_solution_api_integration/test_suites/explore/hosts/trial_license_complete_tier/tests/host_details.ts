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
import TestAgent from 'supertest/lib/agent';
import { BsearchService } from '@kbn/test-suites-src/common/services/bsearch';
import { FtrProviderContextWithSpaces } from '../../../../../ftr_provider_context_with_spaces';
import { hostDetailsFilebeatExpectedResult } from '../mocks/host_details';

export default function ({ getService }: FtrProviderContextWithSpaces) {
  const esArchiver = getService('esArchiver');
  const utils = getService('securitySolutionUtils');

  describe('Host Details', () => {
    let supertest: TestAgent;
    let bsearch: BsearchService;
    describe('With filebeat', () => {
      before(async () => {
        supertest = await utils.createSuperTest();
        bsearch = await utils.createBsearch();
        await esArchiver.load('x-pack/test/functional/es_archives/filebeat/default');
      });
      after(
        async () => await esArchiver.unload('x-pack/test/functional/es_archives/filebeat/default')
      );

      const FROM = '2000-01-01T00:00:00.000Z';
      const TO = '3000-01-01T00:00:00.000Z';

      it('Make sure that we get HostDetails data', async () => {
        const { hostDetails } = await bsearch.send<HostDetailsStrategyResponse>({
          supertest,
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
