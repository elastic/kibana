/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import type { SupertestWithoutAuthProviderType } from '@kbn/ftr-common-functional-services';
import {
  API_VERSIONS,
  PRIVMON_PRIVILEGE_CHECK_API,
} from '@kbn/security-solution-plugin/common/constants';

export const privilegeMonitoringRouteHelpersFactoryNoAuth = (
  supertestWithoutAuth: SupertestWithoutAuthProviderType
) => ({
  privilegesForUser: async ({ username, password }: { username: string; password: string }) =>
    await supertestWithoutAuth
      .get(PRIVMON_PRIVILEGE_CHECK_API)
      .auth(username, password)
      .set('elastic-api-version', API_VERSIONS.public.v1)
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send()
      .expect(200),
});
