/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import {
  API_VERSIONS,
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
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

  describe('@ess @serverless @serverlessQA Set Workflow Status - Common', () => {
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

    const verifyStatus = async (alertIds: string[], expectedStatus: string) => {
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

      body.hits.hits.forEach((hit: { _source: { 'kibana.alert.workflow_status': string } }) => {
        expect(hit._source['kibana.alert.workflow_status']).toEqual(expectedStatus);
      });
    };

    it('should update detection alerts status to closed', async () => {
      const detectionAlertIds = await getAlertIds(getSimpleDetectionAlertsQuery());
      expect(detectionAlertIds.length).toBeGreaterThan(0);

      const { body } = await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          signal_ids: detectionAlertIds.slice(0, 1),
          status: 'closed',
        })
        .expect(200);

      expect(body.updated).toBeGreaterThan(0);
      await verifyStatus(detectionAlertIds.slice(0, 1), 'closed');
    });

    it('should update attack alerts status to closed', async () => {
      const attackAlertIds = await getAlertIds(getSimpleAttackAlertsQuery());
      expect(attackAlertIds.length).toBeGreaterThan(0);

      const { body } = await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          signal_ids: attackAlertIds.slice(0, 1),
          status: 'closed',
        })
        .expect(200);

      expect(body.updated).toBeGreaterThan(0);
      await verifyStatus(attackAlertIds.slice(0, 1), 'closed');
    });

    it('should update both detection and attack alerts in single request', async () => {
      const detectionAlertIds = await getAlertIds(getSimpleDetectionAlertsQuery());
      const attackAlertIds = await getAlertIds(getSimpleAttackAlertsQuery());
      const allAlertIds = [...detectionAlertIds.slice(0, 1), ...attackAlertIds.slice(0, 1)];

      const { body } = await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          signal_ids: allAlertIds,
          status: 'acknowledged',
        })
        .expect(200);

      expect(body.updated).toBeGreaterThan(0);
      await verifyStatus(allAlertIds, 'acknowledged');
    });

    it('should update status to open', async () => {
      const allAlertIds = await getAlertIds(getSimpleQuery());
      expect(allAlertIds.length).toBeGreaterThan(0);

      // First close some alerts
      await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          signal_ids: allAlertIds.slice(0, 1),
          status: 'closed',
        })
        .expect(200);

      // Then reopen them
      const { body } = await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          signal_ids: allAlertIds.slice(0, 1),
          status: 'open',
        })
        .expect(200);

      expect(body.updated).toBeGreaterThan(0);
      await verifyStatus(allAlertIds.slice(0, 1), 'open');
    });

    it('should update status to in-progress', async () => {
      const allAlertIds = await getAlertIds(getSimpleQuery());
      expect(allAlertIds.length).toBeGreaterThan(0);

      const { body } = await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          signal_ids: allAlertIds.slice(0, 1),
          status: 'in-progress',
        })
        .expect(200);

      expect(body.updated).toBeGreaterThan(0);
      await verifyStatus(allAlertIds.slice(0, 1), 'in-progress');
    });

    it('should update status to closed with reason', async () => {
      const allAlertIds = await getAlertIds(getSimpleQuery());
      expect(allAlertIds.length).toBeGreaterThan(0);

      const { body } = await supertest
        .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          signal_ids: allAlertIds.slice(0, 1),
          status: 'closed',
          reason: 'false_positive',
        })
        .expect(200);

      expect(body.updated).toBeGreaterThan(0);

      // Verify status and reason
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
      expect(hit._source['kibana.alert.workflow_status']).toEqual('closed');
      expect(hit._source['kibana.alert.workflow_reason']).toEqual('false_positive');
    });
  });
};
