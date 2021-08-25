/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
    pathname: `/api/apm/correlations/latency/slow_transactions`,
    query: {
      start: range.start,
      end: range.end,
      durationPercentile: 95,
      fieldNames: 'user_agent.name,user_agent.os.name,url.original',
      maxLatency: 3581640.00000003,
      distributionInterval: 238776,
      environment: 'ENVIRONMENT_ALL',
      kuery: '',
    },
  });
  registry.when(
    'correlations latency slow transactions without data',
    { config: 'trial', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(url);

        expect(response.status).to.be(200);
        expect(response.body.response).to.be(undefined);
      });
    }
  );

  // FAILING ES PROMOTION: https://github.com/elastic/kibana/issues/109583
  registry.when.skip(
    'correlations latency slow transactions with data and default args',
    { config: 'trial', archives: ['apm_8.0.0'] },
    () => {
      type ResponseBody = APIReturnType<'GET /api/apm/correlations/latency/slow_transactions'>;
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
        const { significantTerms } = response.body;
        expect(significantTerms.length).to.be.greaterThan(0);

        const sortedFieldNames = significantTerms.map(({ fieldName }) => fieldName).sort();
        expectSnapshot(sortedFieldNames).toMatchInline(`
          Array [
            "url.original",
            "url.original",
            "url.original",
            "user_agent.name",
            "user_agent.name",
            "user_agent.name",
            "user_agent.name",
            "user_agent.os.name",
          ]
        `);
      });

      it('returns a distribution per term', () => {
        const { significantTerms } = response.body;
        expectSnapshot(significantTerms.map((term) => term.distribution.length)).toMatchInline(`
          Array [
            15,
            15,
            15,
            15,
            15,
            15,
            15,
            15,
          ]
        `);
      });
    }
  );
}
