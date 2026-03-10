/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import {
  API_VERSIONS,
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
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

  describe('@ess @serverless @serverlessQA Set Alert Assignees - Common', () => {
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

    const verifyAssignees = async (alertIds: string[], expectedAssignees: string[]) => {
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

      body.hits.hits.forEach(
        (hit: { _source: { 'kibana.alert.workflow_assignee_ids'?: string[] } }) => {
          const assignees = hit._source['kibana.alert.workflow_assignee_ids'] || [];
          expectedAssignees.forEach((assignee) => {
            expect(assignees).toContain(assignee);
          });
        }
      );
    };

    it('should add assignees to detection alerts', async () => {
      const detectionAlertIds = await getAlertIds(getSimpleDetectionAlertsQuery());
      expect(detectionAlertIds.length).toBeGreaterThan(0);

      const { body } = await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          ids: detectionAlertIds.slice(0, 1),
          assignees: {
            add: ['user1', 'user2'],
            remove: [],
          },
        })
        .expect(200);

      expect(body.updated).toBeGreaterThan(0);
      await verifyAssignees(detectionAlertIds.slice(0, 1), ['user1', 'user2']);
    });

    it('should add assignees to attack alerts', async () => {
      const attackAlertIds = await getAlertIds(getSimpleAttackAlertsQuery());
      expect(attackAlertIds.length).toBeGreaterThan(0);

      const { body } = await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          ids: attackAlertIds.slice(0, 1),
          assignees: {
            add: ['user1'],
            remove: [],
          },
        })
        .expect(200);

      expect(body.updated).toBeGreaterThan(0);
      await verifyAssignees(attackAlertIds.slice(0, 1), ['user1']);
    });

    it('should add assignees to both detection and attack alerts in single request', async () => {
      const detectionAlertIds = await getAlertIds(getSimpleDetectionAlertsQuery());
      const attackAlertIds = await getAlertIds(getSimpleAttackAlertsQuery());
      const allAlertIds = [...detectionAlertIds.slice(0, 1), ...attackAlertIds.slice(0, 1)];

      const { body } = await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          ids: allAlertIds,
          assignees: {
            add: ['unified-user'],
            remove: [],
          },
        })
        .expect(200);

      expect(body.updated).toBeGreaterThan(0);
      await verifyAssignees(allAlertIds, ['unified-user']);
    });

    it('should remove assignees from alerts', async () => {
      const allAlertIds = await getAlertIds(getSimpleQuery());
      expect(allAlertIds.length).toBeGreaterThan(0);

      // First add assignees
      await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          ids: allAlertIds.slice(0, 1),
          assignees: {
            add: ['user-to-remove'],
            remove: [],
          },
        })
        .expect(200);

      // Then remove them
      const { body } = await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          ids: allAlertIds.slice(0, 1),
          assignees: {
            add: [],
            remove: ['user-to-remove'],
          },
        })
        .expect(200);

      expect(body.updated).toBeGreaterThan(0);

      // Verify assignee was removed
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
      const assignees = hit._source['kibana.alert.workflow_assignee_ids'] || [];
      expect(assignees).not.toContain('user-to-remove');
    });

    it('should add and remove assignees in the same request', async () => {
      const allAlertIds = await getAlertIds(getSimpleQuery());
      expect(allAlertIds.length).toBeGreaterThan(0);

      // First add initial assignee
      await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          ids: allAlertIds.slice(0, 1),
          assignees: {
            add: ['old-user'],
            remove: [],
          },
        })
        .expect(200);

      // Then add new assignee and remove old assignee
      const { body } = await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          ids: allAlertIds.slice(0, 1),
          assignees: {
            add: ['new-user'],
            remove: ['old-user'],
          },
        })
        .expect(200);

      expect(body.updated).toBeGreaterThan(0);

      // Verify assignees
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
      const assignees = hit._source['kibana.alert.workflow_assignee_ids'] || [];
      expect(assignees).toContain('new-user');
      expect(assignees).not.toContain('old-user');
    });
  });
};
