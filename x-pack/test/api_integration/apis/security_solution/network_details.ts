/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { NetworkQueries } from '../../../../plugins/security_solution/common/search_strategy';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  describe('Network details', () => {
    describe('With filebeat', () => {
      before(() => esArchiver.load('filebeat/default'));
      after(() => esArchiver.unload('filebeat/default'));

      it('Make sure that we get Network details data', async () => {
        const { body } = await supertest
          .post('/internal/search/securitySolutionSearchStrategy/')
          .set('kbn-xsrf', 'true')
          .send({
            ip: '151.205.0.17',
            defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            factoryQueryType: NetworkQueries.details,
            docValueFields: [],
            inspect: false,
          })
          .expect(200);

        expect(body.networkDetails!.source!.geo!.continent_name).to.be('North America');
        expect(body.networkDetails!.source!.geo!.location!.lat!).to.be(37.751);
        expect(body.networkDetails!.host.os!.platform!).to.be('raspbian');
        expect(body.networkDetails!.destination!.geo!.continent_name).to.be('North America');
        expect(body.networkDetails!.destination!.geo!.location!.lat!).to.be(37.751);
        expect(body.networkDetails!.host.os!.platform!).to.be('raspbian');
      });
    });

    describe('With packetbeat', () => {
      before(() => esArchiver.load('packetbeat/default'));
      after(() => esArchiver.unload('packetbeat/default'));

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
          })
          .expect(200);

        expect(body.networkDetails!.host.id!).to.be('2ce8b1e7d69e4a1d9c6bcddc473da9d9');
        expect(body.networkDetails!.host.name!).to.be('zeek-sensor-amsterdam');
        expect(body.networkDetails!.host.os!.platform!).to.be('ubuntu');
      });
    });
  });
}
