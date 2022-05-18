/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { JsonObject } from '@kbn/utility-types';
import { Annotation } from '@kbn/observability-plugin/common/annotations';
import { FtrProviderContext } from '../../common/ftr_provider_context';

const DEFAULT_INDEX_NAME = 'observability-annotations';

// eslint-disable-next-line import/no-default-export
export default function annotationApiTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  function request({ method, url, data }: { method: string; url: string; data?: JsonObject }) {
    switch (method.toLowerCase()) {
      case 'get':
        return supertest.get(url).set('kbn-xsrf', 'foo');

      case 'post':
        return supertest.post(url).send(data).set('kbn-xsrf', 'foo');

      case 'delete':
        return supertest.delete(url).send(data).set('kbn-xsrf', 'foo');

      default:
        throw new Error(`Unsupported methoed ${method}`);
    }
  }

  describe('Observability annotations', () => {
    describe('when creating an annotation', () => {
      afterEach(async () => {
        const indexExists = await es.indices.exists({ index: DEFAULT_INDEX_NAME });
        if (indexExists) {
          await es.indices.delete({
            index: DEFAULT_INDEX_NAME,
          });
        }
      });

      it('fails with a 400 bad request if data is missing', async () => {
        const response = await request({
          url: '/api/observability/annotation',
          method: 'POST',
        });

        expect(response.status).to.be(400);
      });

      it('fails with a 400 bad request if data is invalid', async () => {
        const invalidTimestampResponse = await request({
          url: '/api/observability/annotation',
          method: 'POST',
          data: {
            annotation: {
              type: 'deployment',
            },
            '@timestamp': 'foo',
            message: 'foo',
          },
        });

        expect(invalidTimestampResponse.status).to.be(400);

        const missingMessageResponse = await request({
          url: '/api/observability/annotation',
          method: 'POST',
          data: {
            annotation: {
              type: 'deployment',
            },
            '@timestamp': new Date().toISOString(),
          },
        });

        expect(missingMessageResponse.status).to.be(400);
      });

      it('completes with a 200 and the created annotation if data is complete and valid', async () => {
        const timestamp = new Date().toISOString();

        const response = await request({
          url: '/api/observability/annotation',
          method: 'POST',
          data: {
            annotation: {
              type: 'deployment',
            },
            '@timestamp': timestamp,
            message: 'test message',
            tags: ['apm'],
          },
        });

        expect(response.status).to.be(200);

        const { _source, _id, _index } = response.body;

        expect(response.body).to.eql({
          _index,
          _id,
          _primary_term: 1,
          _seq_no: 0,
          _version: 1,
          found: true,
          _source: {
            annotation: {
              type: 'deployment',
            },
            '@timestamp': timestamp,
            message: 'test message',
            tags: ['apm'],
            event: {
              created: _source.event.created,
            },
          },
        });

        expect(_id).to.be.a('string');

        expect(_source.event.created).to.be.a('string');

        const created = new Date(_source.event.created).getTime();
        expect(created).to.be.greaterThan(0);
        expect(_index).to.be(DEFAULT_INDEX_NAME);
      });

      it('indexes the annotation', async () => {
        const response = await request({
          url: '/api/observability/annotation',
          method: 'POST',
          data: {
            annotation: {
              type: 'deployment',
            },
            '@timestamp': new Date().toISOString(),
            message: 'test message',
            tags: ['apm'],
          },
        });

        expect(response.status).to.be(200);

        const search = await es.search({
          index: DEFAULT_INDEX_NAME,
          track_total_hits: true,
        });

        // @ts-expect-error doesn't handle number
        expect(search.hits.total.value).to.be(1);

        expect(search.hits.hits[0]._source).to.eql(response.body._source);
        expect(search.hits.hits[0]._id).to.eql(response.body._id);
      });

      it('returns the annotation', async () => {
        const { _id: id1 } = (
          await request({
            url: '/api/observability/annotation',
            method: 'POST',
            data: {
              annotation: {
                type: 'deployment',
              },
              '@timestamp': new Date().toISOString(),
              message: '1',
              tags: ['apm'],
            },
          })
        ).body;

        const { _id: id2 } = (
          await request({
            url: '/api/observability/annotation',
            method: 'POST',
            data: {
              annotation: {
                type: 'deployment',
              },
              '@timestamp': new Date().toISOString(),
              message: '2',
              tags: ['apm'],
            },
          })
        ).body;

        expect(
          (
            await request({
              url: `/api/observability/annotation/${id1}`,
              method: 'GET',
            })
          ).body._source.message
        ).to.be('1');

        expect(
          (
            await request({
              url: `/api/observability/annotation/${id2}`,
              method: 'GET',
            })
          ).body._source.message
        ).to.be('2');
      });

      it('deletes the annotation', async () => {
        await request({
          url: '/api/observability/annotation',
          method: 'POST',
          data: {
            annotation: {
              type: 'deployment',
            },
            '@timestamp': new Date().toISOString(),
            message: 'test message',
            tags: ['apm'],
          },
        });

        await request({
          url: '/api/observability/annotation',
          method: 'POST',
          data: {
            annotation: {
              type: 'deployment',
            },
            '@timestamp': new Date().toISOString(),
            message: 'test message 2',
            tags: ['apm'],
          },
        });

        const initialSearch = await es.search<Annotation>({
          index: DEFAULT_INDEX_NAME,
          track_total_hits: true,
        });

        // @ts-expect-error doesn't handler number
        expect(initialSearch.hits.total.value).to.be(2);

        const [id1, id2] = initialSearch.hits.hits.map((hit) => hit._id);

        expect(
          (
            await request({
              url: `/api/observability/annotation/${id1}`,
              method: 'DELETE',
            })
          ).status
        ).to.be(200);

        const searchAfterFirstDelete = await es.search({
          index: DEFAULT_INDEX_NAME,
          track_total_hits: true,
        });

        // @ts-expect-error doesn't handler number
        expect(searchAfterFirstDelete.hits.total.value).to.be(1);

        expect(searchAfterFirstDelete.hits.hits[0]._id).to.be(id2);

        expect(
          (
            await request({
              url: `/api/observability/annotation/${id2}`,
              method: 'DELETE',
            })
          ).status
        ).to.be(200);

        const searchAfterSecondDelete = await es.search({
          index: DEFAULT_INDEX_NAME,
          track_total_hits: true,
        });

        // @ts-expect-error doesn't handle number
        expect(searchAfterSecondDelete.hits.total.value).to.be(0);
      });
    });
  });
}
