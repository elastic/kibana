/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { format } from 'url';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const archiveName = 'apm_8.0.0';
  const range = archives_metadata[archiveName];

  const url = format({
    pathname: `/api/apm/correlations/slow_transactions`,
    query: {
      start: range.start,
      end: range.end,
      durationPercentile: 95,
      fieldNames:
        'user.username,user.id,host.ip,user_agent.name,kubernetes.pod.uuid,url.domain,container.id,service.node.name',
    },
  });

  registry.when('without data', { config: 'trial', archives: [] }, () => {
    it('handles the empty state', async () => {
      const response = await supertest.get(url);

      expect(response.status).to.be(200);
      expect(response.body.response).to.be(undefined);
    });
  });

  registry.when('with data and default args', { config: 'trial', archives: ['apm_8.0.0'] }, () => {
    type ResponseBody = APIReturnType<'GET /api/apm/correlations/slow_transactions'>;
    let response: {
      status: number;
      body: NonNullable<ResponseBody>;
    };

    before(async () => {
      response = await supertest.get(url);
    });

    it('returns successfully', () => {
      expect(response.status).to.eql(200);
    });

    it('returns significant terms', () => {
      const sorted = response.body?.significantTerms?.sort();
      expectSnapshot(sorted?.map((term) => term.fieldName)).toMatchInline(`
            Array [
              "user_agent.name",
              "url.domain",
              "host.ip",
              "service.node.name",
              "container.id",
              "url.domain",
              "user_agent.name",
            ]
          `);
    });

    it('returns a distribution per term', () => {
      expectSnapshot(response.body?.significantTerms?.map((term) => term.distribution.length))
        .toMatchInline(`
            Array [
              11,
              11,
              11,
              11,
              11,
              11,
              11,
            ]
          `);
    });

    it('returns overall distribution', () => {
      expectSnapshot(response.body?.overall?.distribution.length).toMatchInline(`11`);
    });
  });
}
