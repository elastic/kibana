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
} from '@kbn/security-solution-plugin/common/constants';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { noKibanaPrivileges, rulesReadUser } from '../../utils/auth/users';
import { getMissingSecurityKibanaPrivilegesError } from '../../utils/privileges_errors';

export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('@ess Set Workflow Status - ESS', () => {
    describe('RBAC', () => {
      describe('Kibana privileges', () => {
        it('should update alerts with rules read privileges', async () => {
          const { body } = await supertestWithoutAuth
            .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL)
            .auth(rulesReadUser.username, rulesReadUser.password)
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
          const { body } = await supertestWithoutAuth
            .post(DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL)
            .auth(noKibanaPrivileges.username, noKibanaPrivileges.password)
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
