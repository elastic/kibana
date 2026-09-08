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
  DETECTION_ENGINE_ATTACKS_SEARCH_URL,
} from '@kbn/security-solution-plugin/common/constants';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { getSimpleAttackAlertsQuery } from '../../../unified_alerts/utils/queries';
import {
  alertsRead,
  alertsReadNoAttackIndices,
  alertsReadNoDetectionIndices,
  alertsReadNoIndices,
  noKibanaPrivileges,
} from '../../../unified_alerts/utils/auth/roles';
import {
  getMissingAlertsReadPrivilegesError,
  getServerlessMissingReadIndexPrivilegesErrorPattern,
} from '../../../unified_alerts/utils/privileges_errors';
import { expectedAttackAlerts } from '../../../unified_alerts/mocks/alerts';

export default ({ getService }: FtrProviderContext) => {
  const utils = getService('securitySolutionUtils');

  describe('@serverless Search Attacks - Serverless', () => {
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
        it(`should return attack alerts with the role "${role}"`, async () => {
          const testAgent = await utils.createSuperTest(role);

          const { body } = await testAgent
            .post(DETECTION_ENGINE_ATTACKS_SEARCH_URL)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
            .send(getSimpleAttackAlertsQuery())
            .expect(200);

          expect(body.hits.total.value).toEqual(3);
          expect(body.hits.hits).toEqual(expectedAttackAlerts);
        });
      });
    });

    describe('RBAC', () => {
      describe('Kibana privileges', () => {
        it('should return attack alerts with alerts read privileges', async () => {
          const testAgent = await utils.createSuperTestWithCustomRole(alertsRead);

          const { body } = await testAgent
            .post(DETECTION_ENGINE_ATTACKS_SEARCH_URL)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
            .send(getSimpleAttackAlertsQuery())
            .expect(200);

          expect(body.hits.total.value).toEqual(3);
          expect(body.hits.hits).toEqual(expectedAttackAlerts);
        });

        it('should not return attack alerts without alerts read privileges', async () => {
          const testAgent = await utils.createSuperTestWithCustomRole(noKibanaPrivileges);

          const { body } = await testAgent
            .post(DETECTION_ENGINE_ATTACKS_SEARCH_URL)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
            .send(getSimpleAttackAlertsQuery())
            .expect(403);

          expect(body).toEqual(
            getMissingAlertsReadPrivilegesError({
              routeDetails: `POST ${DETECTION_ENGINE_ATTACKS_SEARCH_URL}`,
            })
          );
        });
      });

      describe('Elasticsearch privileges', () => {
        it('should not return attack alerts without index privileges', async () => {
          const testAgent = await utils.createSuperTestWithCustomRole(alertsReadNoIndices);

          const { body } = await testAgent
            .post(DETECTION_ENGINE_ATTACKS_SEARCH_URL)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
            .send(getSimpleAttackAlertsQuery())
            .expect(403);

          expect(body.message).toMatch(getServerlessMissingReadIndexPrivilegesErrorPattern());
        });

        it('should return attack alerts without detection alerts index privileges', async () => {
          const testAgent = await utils.createSuperTestWithCustomRole(alertsReadNoDetectionIndices);

          const { body } = await testAgent
            .post(DETECTION_ENGINE_ATTACKS_SEARCH_URL)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
            .send(getSimpleAttackAlertsQuery())
            .expect(200);

          expect(body.hits.total.value).toEqual(3);
          expect(body.hits.hits).toEqual(expectedAttackAlerts);
        });

        it('should return no attack alerts without attack alerts index privileges', async () => {
          const testAgent = await utils.createSuperTestWithCustomRole(alertsReadNoAttackIndices);

          const { body } = await testAgent
            .post(DETECTION_ENGINE_ATTACKS_SEARCH_URL)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
            .send(getSimpleAttackAlertsQuery())
            .expect(200);

          expect(body.hits.total.value).toEqual(0);
          expect(body.hits.hits).toEqual([]);
        });
      });
    });
  });
};
