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
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { getSimpleAttackAlertsQuery } from '../../../unified_alerts/utils/queries';
import {
  alertsReadNoAttackIndicesUser,
  alertsReadNoDetectionIndicesUser,
  alertsReadNoIndicesUser,
  alertsReadUser,
  noKibanaPrivileges,
} from '../../../unified_alerts/utils/auth/users';
import {
  getMissingAlertsReadPrivilegesError,
  getMissingReadIndexPrivilegesError,
} from '../../../unified_alerts/utils/privileges_errors';
import { expectedAttackAlerts } from '../../../unified_alerts/mocks/alerts';

export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('@ess Search Attacks - ESS', () => {
    describe('RBAC', () => {
      describe('Kibana privileges', () => {
        it('should return attack alerts with alerts read privileges', async () => {
          const { body } = await supertestWithoutAuth
            .post(DETECTION_ENGINE_ATTACKS_SEARCH_URL)
            .auth(alertsReadUser.username, alertsReadUser.password)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
            .send(getSimpleAttackAlertsQuery())
            .expect(200);

          expect(body.hits.total.value).toEqual(3);
          expect(body.hits.hits).toEqual(expectedAttackAlerts);
        });

        it('should not return attack alerts without alerts read privileges', async () => {
          const { body } = await supertestWithoutAuth
            .post(DETECTION_ENGINE_ATTACKS_SEARCH_URL)
            .auth(noKibanaPrivileges.username, noKibanaPrivileges.password)
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
          const { body } = await supertestWithoutAuth
            .post(DETECTION_ENGINE_ATTACKS_SEARCH_URL)
            .auth(alertsReadNoIndicesUser.username, alertsReadNoIndicesUser.password)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
            .send(getSimpleAttackAlertsQuery())
            .expect(403);

          expect(body).toEqual(
            getMissingReadIndexPrivilegesError({
              username: alertsReadNoIndicesUser.username,
              roles: alertsReadNoIndicesUser.roles,
            })
          );
        });

        it('should return attack alerts without detection alerts index privileges', async () => {
          const { body } = await supertestWithoutAuth
            .post(DETECTION_ENGINE_ATTACKS_SEARCH_URL)
            .auth(
              alertsReadNoDetectionIndicesUser.username,
              alertsReadNoDetectionIndicesUser.password
            )
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
            .send(getSimpleAttackAlertsQuery())
            .expect(200);

          expect(body.hits.total.value).toEqual(3);
          expect(body.hits.hits).toEqual(expectedAttackAlerts);
        });

        it('should return no attack alerts without attack alerts index privileges', async () => {
          const { body } = await supertestWithoutAuth
            .post(DETECTION_ENGINE_ATTACKS_SEARCH_URL)
            .auth(alertsReadNoAttackIndicesUser.username, alertsReadNoAttackIndicesUser.password)
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
