/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import {
  getSecurityRoleUrl,
  SECURITY_ROLE_API_VERSION,
  SECURITY_SERVICE_ACCOUNT_URL,
  type ListedServiceAccountsPage,
  type NightshiftServiceAccountsApi,
} from '@kbn/nightshift-investigations-plugin/common';
import { getHttpErrorStatus } from '../common/http_error';

/** The security APIs as the current user, for `ensureNightshiftServiceAccounts` in the browser. */
export const createBrowserServiceAccountsApi = ({
  http,
  serviceAccounts,
}: {
  http: CoreStart['http'];
  serviceAccounts: CoreStart['security']['serviceAccounts'];
}): NightshiftServiceAccountsApi => ({
  listServiceAccounts: (query) =>
    http.get<ListedServiceAccountsPage>(SECURITY_SERVICE_ACCOUNT_URL, { query }),
  roleExists: async (roleName) => {
    try {
      await http.get(getSecurityRoleUrl(roleName), { version: SECURITY_ROLE_API_VERSION });
      return true;
    } catch (error) {
      if (getHttpErrorStatus(error) === 404) return false;
      throw error;
    }
  },
  createServiceAccount: (params) => serviceAccounts.create(params),
  isConflict: (error) => getHttpErrorStatus(error) === 409,
});
