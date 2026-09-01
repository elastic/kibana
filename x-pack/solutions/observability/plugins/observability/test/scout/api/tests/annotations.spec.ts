/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { apiTest } from '../fixtures';
import {
  ANNOTATIONS_API_PATH,
  ANNOTATIONS_INDEX_NAME,
  PUBLIC_HEADERS,
} from '../fixtures/constants';

interface AnnotationDoc {
  _index: string;
  _id: string;
  _source: {
    annotation: { title: string; type: string };
    '@timestamp': string;
    message: string;
    tags: string[];
    event: { created: string };
  };
}

apiTest.describe(
  'Observability annotations API',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let adminApiKey: RoleApiCredentials;
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth }) => {
      // The annotation routes are public and delegate authorization to
      // Elasticsearch, so an admin-scoped API key is required to create the
      // backing index and index documents.
      adminApiKey = await requestAuth.getApiKeyForAdmin();
      headers = { ...PUBLIC_HEADERS, ...adminApiKey.apiKeyHeader };
    });

    apiTest.afterEach(async ({ esClient }) => {
      const indexExists = await esClient.indices.exists({ index: ANNOTATIONS_INDEX_NAME });
      if (indexExists) {
        await esClient.indices.delete({ index: ANNOTATIONS_INDEX_NAME });
      }
    });

    apiTest('fails with a 400 bad request if data is missing', async ({ apiClient }) => {
      const response = await apiClient.post(ANNOTATIONS_API_PATH, {
        headers,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('fails with a 400 bad request if data is invalid', async ({ apiClient }) => {
      const invalidTimestampResponse = await apiClient.post(ANNOTATIONS_API_PATH, {
        headers,
        body: {
          annotation: { type: 'deployment' },
          '@timestamp': 'foo',
          message: 'foo',
        },
        responseType: 'json',
      });

      expect(invalidTimestampResponse).toHaveStatusCode(400);

      const missingMessageResponse = await apiClient.post(ANNOTATIONS_API_PATH, {
        headers,
        body: {
          annotation: { type: 'deployment' },
          '@timestamp': new Date().toISOString(),
        },
        responseType: 'json',
      });

      expect(missingMessageResponse).toHaveStatusCode(400);
    });

    apiTest(
      'completes with a 200 and the created annotation if data is complete and valid',
      async ({ apiClient }) => {
        const timestamp = new Date().toISOString();

        const response = await apiClient.post(ANNOTATIONS_API_PATH, {
          headers,
          body: {
            annotation: { type: 'deployment' },
            '@timestamp': timestamp,
            message: 'test message',
            tags: ['apm'],
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);

        const body = response.body as AnnotationDoc;
        const { _source, _id, _index } = body;

        expect(body).toStrictEqual({
          _index,
          _id,
          _source: {
            annotation: { title: 'test message', type: 'deployment' },
            '@timestamp': timestamp,
            message: 'test message',
            tags: ['apm'],
            event: { created: _source.event.created },
          },
        });

        expect(typeof _id).toBe('string');
        expect(typeof _source.event.created).toBe('string');
        expect(new Date(_source.event.created).getTime()).toBeGreaterThan(0);
        expect(_index).toBe(ANNOTATIONS_INDEX_NAME);
      }
    );

    apiTest('indexes the annotation', async ({ apiClient, esClient }) => {
      const response = await apiClient.post(ANNOTATIONS_API_PATH, {
        headers,
        body: {
          annotation: { type: 'deployment' },
          '@timestamp': new Date().toISOString(),
          message: 'test message',
          tags: ['apm'],
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const created = response.body as AnnotationDoc;

      const search = await esClient.search<AnnotationDoc['_source']>({
        index: ANNOTATIONS_INDEX_NAME,
        track_total_hits: true,
      });

      expect((search.hits.total as { value: number }).value).toBe(1);
      expect(search.hits.hits[0]._source).toStrictEqual(created._source);
      expect(search.hits.hits[0]._id).toBe(created._id);
    });

    apiTest('returns the annotation by id', async ({ apiClient }) => {
      const createAnnotation = async (message: string) => {
        const response = await apiClient.post(ANNOTATIONS_API_PATH, {
          headers,
          body: {
            annotation: { type: 'deployment' },
            '@timestamp': new Date().toISOString(),
            message,
            tags: ['apm'],
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        return (response.body as AnnotationDoc)._id;
      };

      const id1 = await createAnnotation('1');
      const id2 = await createAnnotation('2');

      const first = await apiClient.get(`${ANNOTATIONS_API_PATH}/${id1}`, {
        headers,
        responseType: 'json',
      });
      expect(first).toHaveStatusCode(200);
      expect((first.body as AnnotationDoc)._source.message).toBe('1');

      const second = await apiClient.get(`${ANNOTATIONS_API_PATH}/${id2}`, {
        headers,
        responseType: 'json',
      });
      expect(second).toHaveStatusCode(200);
      expect((second.body as AnnotationDoc)._source.message).toBe('2');
    });

    apiTest('deletes the annotation', async ({ apiClient, esClient }) => {
      const createAnnotation = async (message: string) => {
        const response = await apiClient.post(ANNOTATIONS_API_PATH, {
          headers,
          body: {
            annotation: { type: 'deployment' },
            '@timestamp': new Date().toISOString(),
            message,
            tags: ['apm'],
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
      };

      await createAnnotation('test message');
      await createAnnotation('test message 2');

      const initialSearch = await esClient.search<AnnotationDoc['_source']>({
        index: ANNOTATIONS_INDEX_NAME,
        track_total_hits: true,
      });

      expect((initialSearch.hits.total as { value: number }).value).toBe(2);

      const [id1, id2] = initialSearch.hits.hits.map((hit) => hit._id as string);

      const firstDelete = await apiClient.delete(`${ANNOTATIONS_API_PATH}/${id1}`, {
        headers,
        responseType: 'json',
      });
      expect(firstDelete).toHaveStatusCode(200);

      const searchAfterFirstDelete = await esClient.search({
        index: ANNOTATIONS_INDEX_NAME,
        track_total_hits: true,
      });
      expect((searchAfterFirstDelete.hits.total as { value: number }).value).toBe(1);
      expect(searchAfterFirstDelete.hits.hits[0]._id).toBe(id2);

      const secondDelete = await apiClient.delete(`${ANNOTATIONS_API_PATH}/${id2}`, {
        headers,
        responseType: 'json',
      });
      expect(secondDelete).toHaveStatusCode(200);

      const searchAfterSecondDelete = await esClient.search({
        index: ANNOTATIONS_INDEX_NAME,
        track_total_hits: true,
      });
      expect((searchAfterSecondDelete.hits.total as { value: number }).value).toBe(0);
    });
  }
);
