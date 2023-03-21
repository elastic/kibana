/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  UsersKpiAuthenticationsStrategyResponse,
  UsersQueries,
} from '@kbn/security-solution-plugin/common/search_strategy';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const bsearch = getService('bsearch');

  describe('Kpi Users', () => {
    describe('With filebeat', () => {
      before(
        async () => await esArchiver.load('x-pack/test/functional/es_archives/filebeat/default')
      );
      after(
        async () => await esArchiver.unload('x-pack/test/functional/es_archives/filebeat/default')
      );

      const FROM = '2000-01-01T00:00:00.000Z';
      const TO = '3000-01-01T00:00:00.000Z';
      const expectedResult = {
        authSuccess: 0,
        authSuccessHistogram: null,
        authFailure: 0,
        authFailureHistogram: null,
      };

      it('Make sure that we get KpiAuthentications data', async () => {
        const body = await bsearch.send<UsersKpiAuthenticationsStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: UsersQueries.kpiAuthentications,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['filebeat-*'],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });
        expect(body.authenticationsSuccess).to.eql(expectedResult.authSuccess);
        expect(body.authenticationsSuccessHistogram).to.eql(expectedResult.authSuccessHistogram);
        expect(body.authenticationsFailure).to.eql(expectedResult.authFailure);
        expect(body.authenticationsFailureHistogram).to.eql(expectedResult.authFailureHistogram);
      });
    });

    describe('With auditbeat', () => {
      before(
        async () => await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/default')
      );
      after(
        async () => await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/default')
      );

      const FROM = '2000-01-01T00:00:00.000Z';
      const TO = '3000-01-01T00:00:00.000Z';
      const expectedResult = {
        authSuccess: 0,
        authSuccessHistogram: null,
        authFailure: 0,
        authFailureHistogram: null,
      };

      it('Make sure that we get KpiAuthentications data', async () => {
        const body = await bsearch.send<UsersKpiAuthenticationsStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: UsersQueries.kpiAuthentications,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['auditbeat-*'],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });
        expect(body.authenticationsSuccess).to.eql(expectedResult.authSuccess);
        expect(body.authenticationsSuccessHistogram).to.eql(expectedResult.authSuccessHistogram);
        expect(body.authenticationsFailure).to.eql(expectedResult.authFailure);
        expect(body.authenticationsFailureHistogram).to.eql(expectedResult.authFailureHistogram);
      });
    });
  });
}
