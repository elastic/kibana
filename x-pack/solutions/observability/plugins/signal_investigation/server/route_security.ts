/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteSecurity } from '@kbn/core/server';
import { AuthzDisabled } from '@kbn/core-security-server';
import type { SignalAnalyzerAuthz } from '@kbn/signal-investigation-contract';

const CATALOG_ROUTE_REASON =
  'This route returns analyzer ids and display names only. Each analysis route enforces its own access.';

/** The catalog lists registered analyzers and does not query Elasticsearch. */
export const catalogRouteSecurity = (): RouteSecurity => ({
  authz: { enabled: false, reason: CATALOG_ROUTE_REASON },
});

/** Maps an analyzer's closed authz class to the security object its route is registered with. */
export const routeSecurityForAuthz = (authz: SignalAnalyzerAuthz): RouteSecurity => {
  switch (authz) {
    case 'apm':
      return { authz: { requiredPrivileges: ['apm'] } };
    case 'apm_ml':
      return { authz: { requiredPrivileges: ['apm', 'ml:canGetJobs'] } };
    case 'es_delegated':
      return { authz: AuthzDisabled.delegateToESClient };
  }
};
