/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { SourceResponse } from '../../../../plugins/infra/server/lib/sources';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const fetchSource = async (): Promise<SourceResponse | undefined> => {
    const response = await supertest
      .get('/api/metrics/source/default/metrics')
      .set('kbn-xsrf', 'xxx')
      .expect(200);
    return response.body;
  };
  const fetchHasData = async (
    type: 'logs' | 'metrics'
  ): Promise<{ hasData: boolean } | undefined> => {
    const response = await supertest
      .get(`/api/metrics/source/default/${type}/hasData`)
      .set('kbn-xsrf', 'xxx')
      .expect(200);
    return response.body;
  };

  describe('Source API via HTTP', () => {
    describe('8.0.0', () => {
      before(() => esArchiver.load('infra/8.0.0/logs_and_metrics'));
      after(() => esArchiver.unload('infra/8.0.0/logs_and_metrics'));
      describe('/api/metrics/source/default/metrics', () => {
        it('should just work', () => {
          const resp = fetchSource();
          return resp.then((data) => {
            expect(data).to.have.property('source');
            expect(data?.source.configuration.metricAlias).to.equal('metrics-*,metricbeat-*');
            expect(data?.source.configuration.logAlias).to.equal(
              'logs-*,filebeat-*,kibana_sample_data_logs*'
            );
            expect(data?.source.configuration.fields).to.eql({
              container: 'container.id',
              host: 'host.name',
              message: ['message', '@message'],
              pod: 'kubernetes.pod.uid',
              tiebreaker: '_doc',
              timestamp: '@timestamp',
            });
            expect(data).to.have.property('status');
            expect(data?.status.metricIndicesExist).to.equal(true);
            expect(data?.status.logIndicesExist).to.equal(true);
          });
        });
      });
      describe('/api/metrics/source/default/metrics/hasData', () => {
        it('should just work', () => {
          const resp = fetchHasData('metrics');
          return resp.then((data) => {
            expect(data).to.have.property('hasData');
            expect(data?.hasData).to.be(true);
          });
        });
      });
      describe('/api/metrics/source/default/logs/hasData', () => {
        it('should just work', () => {
          const resp = fetchHasData('logs');
          return resp.then((data) => {
            expect(data).to.have.property('hasData');
            expect(data?.hasData).to.be(true);
          });
        });
      });
    });
  });
}
