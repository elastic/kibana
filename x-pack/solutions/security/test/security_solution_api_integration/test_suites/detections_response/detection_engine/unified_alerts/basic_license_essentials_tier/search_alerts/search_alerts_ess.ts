/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

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
import { noKibanaPrivileges, secOnly } from '../../utils/auth/users';
import { getMissingSecurityKibanaPrivilegesError } from '../../utils/privileges_errors';

export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('@ess Search Alerts - ESS', () => {
    describe('RBAC', () => {
      it('should return all alerts with security solution privileges', async () => {
        const { body } = await supertestWithoutAuth
          .post(DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL)
          .auth(secOnly.username, secOnly.password)
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .send(getSimpleQuery())
          .expect(200);
        expect(body.hits.total.value).toEqual(6);
      });

      it('should not return alerts without security kibana privileges', async () => {
        const { body } = await supertestWithoutAuth
          .post(DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL)
          .auth(noKibanaPrivileges.username, noKibanaPrivileges.password)
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
