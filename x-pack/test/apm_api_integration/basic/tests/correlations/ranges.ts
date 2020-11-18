/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { format } from 'url';
import { PromiseReturnType } from '../../../../../plugins/observability/typings/common';
import archives_metadata from '../../../common/archives_metadata';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const archiveName = 'apm_8.0.0';
  const range = archives_metadata[archiveName];

  // url parameters
  const start = '2020-09-29T14:45:00.000Z';
  const end = range.end;
  const fieldNames =
    'user.username,user.id,host.ip,user_agent.name,kubernetes.pod.uuid,url.domain,container.id,service.node.name';

  describe('Ranges', function () {
    this.tags();

    const url = format({
      pathname: `/api/apm/correlations/ranges`,
      query: { start, end, fieldNames },
    });

    describe('when data is not loaded ', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(url);
        expect(response.status).to.be(200);
        expect(response.body.response).to.be(undefined);
      });
    });

    describe('when data is loaded', () => {
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
            20,
            6,
            5,
            4,
          ]
        `);
      });

      it('returns buckets', () => {
        const { buckets } = response.body.response['user.id'].value;
        expectSnapshot(buckets[0]).toMatchInline(`
          Object {
            "bg_count": 2,
            "doc_count": 7,
            "key": "20",
            "score": 3.5,
          }
        `);
      });
    });
  });
}
