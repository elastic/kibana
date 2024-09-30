/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  NetworkDetailsStrategyResponse,
  NetworkQueries,
} from '@kbn/security-solution-plugin/common/search_strategy';
import TestAgent from 'supertest/lib/agent';
import { BsearchService } from '@kbn/ftr-common-functional-services';

import { FtrProviderContextWithSpaces } from '../../../../../ftr_provider_context_with_spaces';

export default function ({ getService }: FtrProviderContextWithSpaces) {
  const esArchiver = getService('esArchiver');
  const utils = getService('securitySolutionUtils');

  describe('Network details', () => {
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

      it('Make sure that we get Network details data', async () => {
        const body = await bsearch.send<NetworkDetailsStrategyResponse>({
          supertest,
          options: {
            ip: '151.205.0.17',
            defaultIndex: ['filebeat-*'],
            factoryQueryType: NetworkQueries.details,
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });

        expect(body.networkDetails.source?.geo.continent_name).to.eql(['North America']);
        expect(body.networkDetails.source?.geo.location?.lat!).to.eql([37.751]);
        expect(body.networkDetails.host?.os?.platform).to.eql(['raspbian']);
      });
    });

    describe('With packetbeat', () => {
      before(async () => {
        supertest = await utils.createSuperTest();
        bsearch = await utils.createBsearch();
        await esArchiver.load('x-pack/test/functional/es_archives/packetbeat/default');
      });
      after(
        async () => await esArchiver.unload('x-pack/test/functional/es_archives/packetbeat/default')
      );

      it('Make sure that we get Network details data', async () => {
        const body = await bsearch.send<NetworkDetailsStrategyResponse>({
          supertest,
          options: {
            ip: '185.53.91.88',
            defaultIndex: ['packetbeat-*'],
            factoryQueryType: NetworkQueries.details,
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });

        expect(body.networkDetails.host?.id).to.eql(['2ce8b1e7d69e4a1d9c6bcddc473da9d9']);
        expect(body.networkDetails.host?.name).to.eql(['zeek-sensor-amsterdam']);
        expect(body.networkDetails.host?.os?.platform!).to.eql(['ubuntu']);
      });
    });
  });
}
