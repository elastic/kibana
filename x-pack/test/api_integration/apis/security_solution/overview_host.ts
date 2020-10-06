/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { HostsQueries } from '../../../../plugins/security_solution/common/search_strategy';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('Overview Host', () => {
    describe('With auditbeat', () => {
      before(() => esArchiver.load('auditbeat/overview'));
      after(() => esArchiver.unload('auditbeat/overview'));

      const FROM = '2000-01-01T00:00:00.000Z';
      const TO = '3000-01-01T00:00:00.000Z';
      const expectedResult = {
        auditbeatAuditd: 2194,
        auditbeatFIM: 4,
        auditbeatLogin: 2810,
        auditbeatPackage: 3,
        auditbeatProcess: 7,
        auditbeatUser: 6,
        endgameDns: 1,
        endgameFile: 2,
        endgameImageLoad: 1,
        endgameNetwork: 4,
        endgameProcess: 2,
        endgameRegistry: 1,
        endgameSecurity: 4,
        filebeatSystemModule: 0,
        winlogbeatSecurity: 0,
        winlogbeatMWSysmonOperational: null,
      };

      it('Make sure that we get OverviewHost data', async () => {
        const {
          body: { overviewHost },
        } = await supertest
          .post('/internal/search/securitySolutionSearchStrategy/')
          .set('kbn-xsrf', 'true')
          .send({
            defaultIndex: [
              'apm-*-transaction*',
              'auditbeat-*',
              'endgame-*',
              'filebeat-*',
              'logs-*',
              'packetbeat-*',
              'winlogbeat-*',
            ],
            factoryQueryType: HostsQueries.overview,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            docValueFields: [],
            inspect: false,
          })
          .expect(200);
        expect(overviewHost).to.eql(expectedResult);
      });
    });
  });
}
