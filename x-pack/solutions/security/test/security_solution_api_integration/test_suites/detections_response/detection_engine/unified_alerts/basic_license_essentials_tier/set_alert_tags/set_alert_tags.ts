/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import {
  API_VERSIONS,
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
  DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL,
} from '@kbn/security-solution-plugin/common/constants';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  getSimpleAttackAlertsQuery,
  getSimpleDetectionAlertsQuery,
  getSimpleQuery,
} from '../../utils/queries';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');

  describe('@ess @serverless @serverlessQA Set Alert Tags - Common', () => {
    const getAlertIds = async (query: object) => {
      const { body } = await supertest
        .post(DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send(query)
        .expect(200);
      return body.hits.hits.map((hit: { _id: string }) => hit._id);
    };

    const verifyTags = async (alertIds: string[], expectedTags: string[]) => {
      const { body } = await supertest
        .post(DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          query: {
            bool: {
              filter: {
                terms: { _id: alertIds },
              },
            },
          },
        })
        .expect(200);

      body.hits.hits.forEach((hit: { _source: { 'kibana.alert.workflow_tags'?: string[] } }) => {
        const tags = hit._source['kibana.alert.workflow_tags'] || [];
        expectedTags.forEach((tag) => {
          expect(tags).toContain(tag);
        });
      });
    };

    it('should add tags to detection alerts', async () => {
      const detectionAlertIds = await getAlertIds(getSimpleDetectionAlertsQuery());
      expect(detectionAlertIds.length).toBeGreaterThan(0);

      const { body } = await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          ids: detectionAlertIds.slice(0, 1),
          tags: {
            tags_to_add: ['test-tag-1', 'test-tag-2'],
            tags_to_remove: [],
          },
        })
        .expect(200);

      expect(body.updated).toBeGreaterThan(0);
      await verifyTags(detectionAlertIds.slice(0, 1), ['test-tag-1', 'test-tag-2']);
    });

    it('should add tags to attack alerts', async () => {
      const attackAlertIds = await getAlertIds(getSimpleAttackAlertsQuery());
      expect(attackAlertIds.length).toBeGreaterThan(0);

      const { body } = await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          ids: attackAlertIds.slice(0, 1),
          tags: {
            tags_to_add: ['attack-tag-1'],
            tags_to_remove: [],
          },
        })
        .expect(200);

      expect(body.updated).toBeGreaterThan(0);
      await verifyTags(attackAlertIds.slice(0, 1), ['attack-tag-1']);
    });

    it('should add tags to both detection and attack alerts in single request', async () => {
      const detectionAlertIds = await getAlertIds(getSimpleDetectionAlertsQuery());
      const attackAlertIds = await getAlertIds(getSimpleAttackAlertsQuery());
      const allAlertIds = [...detectionAlertIds.slice(0, 1), ...attackAlertIds.slice(0, 1)];

      const { body } = await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          ids: allAlertIds,
          tags: {
            tags_to_add: ['unified-tag'],
            tags_to_remove: [],
          },
        })
        .expect(200);

      expect(body.updated).toBeGreaterThan(0);
      await verifyTags(allAlertIds, ['unified-tag']);
    });

    it('should remove tags from alerts', async () => {
      const allAlertIds = await getAlertIds(getSimpleQuery());
      expect(allAlertIds.length).toBeGreaterThan(0);

      // First add tags
      await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          ids: allAlertIds.slice(0, 1),
          tags: {
            tags_to_add: ['tag-to-remove'],
            tags_to_remove: [],
          },
        })
        .expect(200);

      // Then remove them
      const { body } = await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          ids: allAlertIds.slice(0, 1),
          tags: {
            tags_to_add: [],
            tags_to_remove: ['tag-to-remove'],
          },
        })
        .expect(200);

      expect(body.updated).toBeGreaterThan(0);

      // Verify tag was removed
      const { body: searchBody } = await supertest
        .post(DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          query: {
            bool: {
              filter: {
                terms: { _id: allAlertIds.slice(0, 1) },
              },
            },
          },
        })
        .expect(200);

      const hit = searchBody.hits.hits[0];
      const tags = hit._source['kibana.alert.workflow_tags'] || [];
      expect(tags).not.toContain('tag-to-remove');
    });

    it('should add and remove tags in the same request', async () => {
      const allAlertIds = await getAlertIds(getSimpleQuery());
      expect(allAlertIds.length).toBeGreaterThan(0);

      // First add initial tag
      await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          ids: allAlertIds.slice(0, 1),
          tags: {
            tags_to_add: ['old-tag'],
            tags_to_remove: [],
          },
        })
        .expect(200);

      // Then add new tag and remove old tag
      const { body } = await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          ids: allAlertIds.slice(0, 1),
          tags: {
            tags_to_add: ['new-tag'],
            tags_to_remove: ['old-tag'],
          },
        })
        .expect(200);

      expect(body.updated).toBeGreaterThan(0);

      // Verify tags
      const { body: searchBody } = await supertest
        .post(DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          query: {
            bool: {
              filter: {
                terms: { _id: allAlertIds.slice(0, 1) },
              },
            },
          },
        })
        .expect(200);

      const hit = searchBody.hits.hits[0];
      const tags = hit._source['kibana.alert.workflow_tags'] || [];
      expect(tags).toContain('new-tag');
      expect(tags).not.toContain('old-tag');
    });
  });
};
