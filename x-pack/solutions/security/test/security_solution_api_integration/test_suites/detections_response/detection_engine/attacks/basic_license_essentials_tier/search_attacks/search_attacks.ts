/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import {
  API_VERSIONS,
  DETECTION_ENGINE_ATTACKS_SEARCH_URL,
} from '@kbn/security-solution-plugin/common/constants';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  getSimpleAttackAlertsQuery,
  getSimpleDetectionAlertsQuery,
} from '../../../unified_alerts/utils/queries';
import { expectedAttackAlerts } from '../../../unified_alerts/mocks/alerts';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');

  describe('@ess @serverless @serverlessQA Search Attacks', () => {
    it('should fetch only attack alerts', async () => {
      const { body } = await supertest
        .post(DETECTION_ENGINE_ATTACKS_SEARCH_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
        .send(getSimpleAttackAlertsQuery())
        .expect(200);

      expect(body.hits.total.value).toEqual(3);
      expect(body.hits.hits).toEqual(expectedAttackAlerts);
    });

    it('should not return detection alerts when querying for detection-only fields', async () => {
      const { body } = await supertest
        .post(DETECTION_ENGINE_ATTACKS_SEARCH_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
        .send(getSimpleDetectionAlertsQuery())
        .expect(200);

      expect(body.hits.total.value).toEqual(0);
      expect(body.hits.hits).toEqual([]);
    });

    it('should return 200 when the request body contains aggregations only', async () => {
      const { body } = await supertest
        .post(DETECTION_ENGINE_ATTACKS_SEARCH_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
        .send({
          aggs: {
            statuses: { terms: { field: ALERT_WORKFLOW_STATUS, size: 10 } },
          },
        })
        .expect(200);

      expect(body.aggregations).toBeDefined();
    });

    it('should fetch attack alerts by ids', async () => {
      const attackId = '40980216-cf98-4447-af57-894c0e7c39b4';
      const { body } = await supertest
        .post(DETECTION_ENGINE_ATTACKS_SEARCH_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
        .send({ ids: [attackId] })
        .expect(200);

      expect(body.hits.total.value).toEqual(1);
      expect(body.hits.hits).toEqual([expectedAttackAlerts[0]]);
    });

    it('should return 400 when the request body is empty', async () => {
      const { body } = await supertest
        .post(DETECTION_ENGINE_ATTACKS_SEARCH_URL)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
        .send({})
        .expect(400);

      expect(body.message).toEqual('"value" must have at least 1 children');
    });
  });
};
