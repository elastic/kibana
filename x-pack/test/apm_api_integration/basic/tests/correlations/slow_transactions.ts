/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { format } from 'url';
import { APIReturnType } from '../../../../../plugins/apm/public/services/rest/createCallApmApi';
import archives_metadata from '../../../common/archives_metadata';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { expectSnapshot } from '../../../common/match_snapshot';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const archiveName = 'apm_8.0.0';
  const range = archives_metadata[archiveName];

  describe('Slow durations', () => {
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

    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(url);

        expect(response.status).to.be(200);
        expect(response.body.response).to.be(undefined);
      });
    });

    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      describe('making request with default args', () => {
        type ResponseBody = APIReturnType<'/api/apm/correlations/slow_transactions', 'GET'>;
        let response: {
          status: number;
          body: ResponseBody;
        };

        before(async () => {
          response = await supertest.get(url);
        });

        it('returns successfully', () => {
          expect(response.status).to.eql(200);
        });

        it('returns significant terms', () => {
          expectSnapshot(response.body?.significantTerms.map((term) => term.fieldName))
            .toMatchInline(`
            Array [
              "host.ip",
              "service.node.name",
              "container.id",
              "url.domain",
              "user_agent.name",
              "user.id",
              "host.ip",
              "service.node.name",
              "container.id",
              "user.id",
            ]
          `);
        });

        it('returns a timeseries per term', () => {
          expectSnapshot(response.body?.significantTerms[0].timeseries.length).toMatchInline(`31`);
        });

        it('returns a distribution per term', () => {
          expectSnapshot(response.body?.significantTerms[0].distribution.length).toMatchInline(
            `11`
          );
        });

        it('returns overall timeseries', () => {
          expectSnapshot(response.body?.overall.timeseries.length).toMatchInline(`31`);
        });

        it('returns overall distribution', () => {
          expectSnapshot(response.body?.overall.distribution.length).toMatchInline(`11`);
        });
      });
    });
  });
}
