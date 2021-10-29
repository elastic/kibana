/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { SourceResponse } from '../../../../plugins/infra/server/lib/sources';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const fetchSource = async (): Promise<SourceResponse | undefined> => {
    const response = await supertest
      .get('/api/metrics/source/default')
      .set('kbn-xsrf', 'xxx')
      .expect(200);
    return response.body;
  };
  const fetchHasData = async (): Promise<{ hasData: boolean } | undefined> => {
    const response = await supertest
      .get(`/api/metrics/source/default/hasData`)
      .set('kbn-xsrf', 'xxx')
      .expect(200);
    return response.body;
  };

  describe('Source API via HTTP', () => {
    describe('8.0.0', () => {
      before(() =>
        esArchiver.load('x-pack/test/functional/es_archives/infra/8.0.0/logs_and_metrics')
      );
      after(() =>
        esArchiver.unload('x-pack/test/functional/es_archives/infra/8.0.0/logs_and_metrics')
      );
      describe('/api/metrics/source/default', () => {
        it('should just work', async () => {
          const resp = fetchSource();
          return resp.then((data) => {
            expect(data).to.have.property('source');
            expect(data?.source.configuration.metricAlias).to.equal('metrics-*,metricbeat-*');
            expect(data?.source).to.have.property('status');
            expect(data?.source.status?.metricIndicesExist).to.equal(true);
          });
        });
      });
      describe('/api/metrics/source/default/hasData', () => {
        it('should just work', async () => {
          const resp = fetchHasData();
          return resp.then((data) => {
            expect(data).to.have.property('hasData');
            expect(data?.hasData).to.be(true);
          });
        });
      });
    });
  });
}
