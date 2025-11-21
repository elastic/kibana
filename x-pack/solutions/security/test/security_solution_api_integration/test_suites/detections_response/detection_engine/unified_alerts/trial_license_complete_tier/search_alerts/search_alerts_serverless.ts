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
  attackDiscoveryOnlyAll,
  noKibanaPrivileges,
  securitySolutionAndAttackDiscoveryAll,
  securitySolutionOnlyAll,
} from '../../utils/auth/roles';
import {
  getMissingAttackDiscoveryKibanaPrivilegesError,
  getMissingSecurityAndAttackDiscoveryKibanaPrivilegesError,
  getMissingSecurityKibanaPrivilegesError,
} from '../../utils/privileges_errors';

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
        it(`should create a new schedule in a non-default space with the role "${role}"`, async () => {
          const testAgent = await utils.createSuperTest(role);

          const { body } = await testAgent
            .post(DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .send(getSimpleQuery())
            .expect(200);
          expect(body.hits.total.value).toEqual(6);
        });
      });
    });

    describe('RBAC', () => {
      it('should return all alerts with security solution and attack discovery privileges', async () => {
        const testAgent = await utils.createSuperTestWithCustomRole(
          securitySolutionAndAttackDiscoveryAll
        );

        const { body } = await testAgent
          .post(DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL)
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send(getSimpleQuery())
          .expect(200);
        expect(body.hits.total.value).toEqual(6);
      });

      it('should not return alerts without security and attack discovery kibana privileges', async () => {
        const testAgent = await utils.createSuperTestWithCustomRole(noKibanaPrivileges);

        const { body } = await testAgent
          .post(DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL)
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send(getSimpleQuery())
          .expect(403);

        expect(body).toEqual(
          getMissingSecurityAndAttackDiscoveryKibanaPrivilegesError({
            routeDetails: `POST ${DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL}`,
          })
        );
      });

      it('should not return alerts without attack discovery kibana privileges', async () => {
        const testAgent = await utils.createSuperTestWithCustomRole(securitySolutionOnlyAll);

        const { body } = await testAgent
          .post(DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL)
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send(getSimpleQuery())
          .expect(403);

        expect(body).toEqual(
          getMissingAttackDiscoveryKibanaPrivilegesError({
            routeDetails: `POST ${DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL}`,
          })
        );
      });

      it('should not return alerts without security kibana privileges', async () => {
        const testAgent = await utils.createSuperTestWithCustomRole(attackDiscoveryOnlyAll);

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
  });
};
