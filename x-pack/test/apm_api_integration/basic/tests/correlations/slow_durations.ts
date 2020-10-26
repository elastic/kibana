/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { format } from 'url';
import { PromiseReturnType } from '../../../../../plugins/apm/typings/common';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { expectSnapshot } from '../../../common/match_snapshot';
import archives_metadata from '../../../common/archives_metadata';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const archiveName = 'apm_8.0.0';
  const range = archives_metadata[archiveName];

  // url parameters
  const start = range.start;
  const end = range.end;
  const durationPercentile = 95;
  const fieldNames =
    'user.username,user.id,host.ip,user_agent.name,kubernetes.pod.uuid,url.domain,container.id,service.node.name';

  // Failing: See https://github.com/elastic/kibana/issues/81264
  describe.skip('Slow durations', () => {
    const url = format({
      pathname: `/api/apm/correlations/slow_durations`,
      query: { start, end, durationPercentile, fieldNames },
    });

    describe('when data is not loaded ', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(url);

        expect(response.status).to.be(200);
        expect(response.body.response).to.be(undefined);
      });
    });

    describe('with default scoring', () => {
      let response: PromiseReturnType<typeof supertest.get>;
      before(async () => {
        await esArchiver.load(archiveName);
        response = await supertest.get(url);
      });

      after(() => esArchiver.unload(archiveName));

      it('returns successfully', () => {
        expect(response.status).to.eql(200);
      });

      it('returns fields in response', () => {
        expectSnapshot(Object.keys(response.body.response)).toMatchInline(`
          Array [
            "service.node.name",
            "host.ip",
            "user.id",
            "user_agent.name",
            "container.id",
            "url.domain",
          ]
        `);
      });

      it('returns cardinality for each field', () => {
        const cardinalitys = Object.values(response.body.response).map(
          (field: any) => field.cardinality
        );

        expectSnapshot(cardinalitys).toMatchInline(`
          Array [
            5,
            6,
            3,
            5,
            5,
            4,
          ]
        `);
      });

      it('returns buckets', () => {
        const { buckets } = response.body.response['user.id'].value;
        expectSnapshot(buckets[0]).toMatchInline(`
          Object {
            "bg_count": 32,
            "doc_count": 6,
            "key": "2",
            "score": 0.1875,
          }
        `);
      });
    });

    describe('with different scoring', () => {
      before(async () => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      it(`returns buckets for each score`, async () => {
        const promises = ['percentage', 'jlh', 'chi_square', 'gnd'].map(async (scoring) => {
          const response = await supertest.get(
            format({
              pathname: `/api/apm/correlations/slow_durations`,
              query: { start, end, durationPercentile, fieldNames, scoring },
            })
          );

          return { name: scoring, value: response.body.response['user.id'].value.buckets[0].score };
        });

        const res = await Promise.all(promises);
        expectSnapshot(res).toMatchInline(`
          Array [
            Object {
              "name": "percentage",
              "value": 0.1875,
            },
            Object {
              "name": "jlh",
              "value": 3.33506905769659,
            },
            Object {
              "name": "chi_square",
              "value": 219.192006524483,
            },
            Object {
              "name": "gnd",
              "value": 0.671406580688819,
            },
          ]
        `);
      });
    });
  });
}
