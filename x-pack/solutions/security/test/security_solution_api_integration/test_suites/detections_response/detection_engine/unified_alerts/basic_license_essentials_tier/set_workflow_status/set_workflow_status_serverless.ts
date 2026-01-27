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
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
} from '@kbn/security-solution-plugin/common/constants';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { noKibanaPrivileges, rulesRead } from '../../utils/auth/roles';
import { getMissingSecurityKibanaPrivilegesError } from '../../utils/privileges_errors';

export default ({ getService }: FtrProviderContext) => {
  const utils = getService('securitySolutionUtils');

  describe('@serverless Set Workflow Status - Serverless', () => {
    describe('Happy path for predefined users', () => {
      const roles = [
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
        it(`should update alerts with the role "${role}"`, async () => {
          const testAgent = await utils.createSuperTest(role);

          const { body } = await testAgent
            .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .send({
              signal_ids: ['test-id'],
              status: 'closed',
            })
            .expect(200);

          expect(body).toHaveProperty('updated');
        });
      });
    });

    describe('RBAC', () => {
      describe('Kibana privileges', () => {
        it('should update alerts with rules read privileges', async () => {
          const testAgent = await utils.createSuperTestWithCustomRole(rulesRead);

          const { body } = await testAgent
            .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .send({
              signal_ids: ['test-id'],
              status: 'closed',
            })
            .expect(200);

          expect(body).toHaveProperty('updated');
        });

        it('should not update alerts without rules read privileges', async () => {
          const testAgent = await utils.createSuperTestWithCustomRole(noKibanaPrivileges);

          const { body } = await testAgent
            .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .send({
              signal_ids: ['test-id'],
              status: 'closed',
            })
            .expect(403);

          expect(body).toEqual(
            getMissingSecurityKibanaPrivilegesError({
              routeDetails: `POST ${DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL}`,
            })
          );
        });
      });
    });
  });
};
