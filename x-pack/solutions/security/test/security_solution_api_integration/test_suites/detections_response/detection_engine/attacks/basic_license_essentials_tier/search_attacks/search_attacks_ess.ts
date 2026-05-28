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
import { noKibanaPrivileges } from '../../../unified_alerts/utils/auth/users';
import { getMissingAlertsReadPrivilegesError } from '../../../unified_alerts/utils/privileges_errors';

export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('@ess Search Attacks - ESS', () => {
    describe('RBAC', () => {
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
  });
};
