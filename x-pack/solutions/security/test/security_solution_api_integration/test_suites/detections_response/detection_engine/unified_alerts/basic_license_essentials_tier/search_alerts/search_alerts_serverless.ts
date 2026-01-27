/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { ROLES } from '@kbn/security-solution-plugin/common/test';
import {
  API_VERSIONS,
  DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL,
} from '@kbn/security-solution-plugin/common/constants';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { getSimpleQuery } from '../../utils/queries';
import {
  noKibanaPrivileges,
  rulesReadNoAttackIndices,
  rulesReadNoDetectionIndices,
  rulesReadNoIndices,
  rulesRead,
} from '../../utils/auth/roles';
import {
  getMissingSecurityKibanaPrivilegesError,
  getServerlessMissingReadIndexPrivilegesErrorPattern,
} from '../../utils/privileges_errors';
import { expectedAttackAlerts, expectedDetectionAlerts } from '../../mocks';

export default ({ getService }: FtrProviderContext) => {
  const utils = getService('securitySolutionUtils');

  describe('@serverless Search Alerts - Serverless', () => {
    describe('Happy path for predefined users', () => {
      const roles = [
        'viewer',
        'editor',
        ROLES.t1_analyst,
        ROLES.t2_analyst,
        ROLES.t3_analyst,
        ROLES.rule_author,
        ROLES.soc_manager,
        ROLES.detections_admin,
        ROLES.platform_engineer,
      ];

      roles.forEach((role) => {
        it(`should return all alerts with the role "${role}"`, async () => {
          const testAgent = await utils.createSuperTest(role);

          const { body } = await testAgent
            .post(DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .send(getSimpleQuery())
            .expect(200);
          expect(body.hits.total.value).toEqual(6);
          expect(body.hits.hits).toEqual([...expectedDetectionAlerts, ...expectedAttackAlerts]);
        });
      });
    });

    describe('RBAC', () => {
      describe('Kibana privileges', () => {
        it('should return all alerts with rules read privileges', async () => {
          const testAgent = await utils.createSuperTestWithCustomRole(rulesRead);

          const { body } = await testAgent
            .post(DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .send(getSimpleQuery())
            .expect(200);
          expect(body.hits.total.value).toEqual(6);
          expect(body.hits.hits).toEqual([...expectedDetectionAlerts, ...expectedAttackAlerts]);
        });

        it('should not return alerts without rules read privileges', async () => {
          const testAgent = await utils.createSuperTestWithCustomRole(noKibanaPrivileges);

          const { body } = await testAgent
            .post(DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .send(getSimpleQuery())
            .expect(403);

          expect(body).toEqual(
            getMissingSecurityKibanaPrivilegesError({
              routeDetails: `POST ${DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL}`,
            })
          );
        });
      });

      describe('Elasticsearch privileges', () => {
        it('should not return alerts without index privileges', async () => {
          const testAgent = await utils.createSuperTestWithCustomRole(rulesReadNoIndices);

          const { body } = await testAgent
            .post(DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .send(getSimpleQuery())
            .expect(403);

          expect(body.message).toMatch(getServerlessMissingReadIndexPrivilegesErrorPattern());
        });

        it('should return only attack alerts without detection alerts index privileges', async () => {
          const testAgent = await utils.createSuperTestWithCustomRole(rulesReadNoDetectionIndices);

          const { body } = await testAgent
            .post(DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .send(getSimpleQuery())
            .expect(200);

          expect(body.hits.total.value).toEqual(3);
          expect(body.hits.hits).toEqual([...expectedAttackAlerts]);
        });

        it('should return only detection alerts without attack alerts index privileges', async () => {
          const testAgent = await utils.createSuperTestWithCustomRole(rulesReadNoAttackIndices);

          const { body } = await testAgent
            .post(DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .send(getSimpleQuery())
            .expect(200);

          expect(body.hits.total.value).toEqual(3);
          expect(body.hits.hits).toEqual([...expectedDetectionAlerts]);
        });
      });
    });
  });
};
