/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { NetworkQueries } from '../../../../plugins/security_solution/common/search_strategy';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  describe('Network details', () => {
    describe('With filebeat', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/filebeat/default'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/filebeat/default'));

      it('Make sure that we get Network details data', async () => {
        const { body } = await supertest
          .post('/internal/search/securitySolutionSearchStrategy/')
          .set('kbn-xsrf', 'true')
          .send({
            ip: '151.205.0.17',
            defaultIndex: ['filebeat-*'],
            factoryQueryType: NetworkQueries.details,
            docValueFields: [],
            inspect: false,
            wait_for_completion_timeout: '10s',
          })
          .expect(200);

        expect(body.networkDetails!.source!.geo!.continent_name).to.be('North America');
        expect(body.networkDetails!.source!.geo!.location!.lat!).to.be(37.751);
        expect(body.networkDetails!.host.os!.platform!).to.eql(['raspbian']);
      });
    });

    describe('With packetbeat', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/packetbeat/default'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/packetbeat/default'));

      it('Make sure that we get Network details data', async () => {
        const { body } = await supertest
          .post('/internal/search/securitySolutionSearchStrategy/')
          .set('kbn-xsrf', 'true')
          .send({
            ip: '185.53.91.88',
            defaultIndex: ['packetbeat-*'],
            factoryQueryType: NetworkQueries.details,
            docValueFields: [],
            inspect: false,
            wait_for_completion_timeout: '10s',
          })
          .expect(200);

        expect(body.networkDetails!.host.id!).to.eql(['2ce8b1e7d69e4a1d9c6bcddc473da9d9']);
        expect(body.networkDetails!.host.name!).to.eql(['zeek-sensor-amsterdam']);
        expect(body.networkDetails!.host.os!.platform!).to.eql(['ubuntu']);
      });
    });
  });
}
