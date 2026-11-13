/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_RUN_LIMIT,
  NIGHTSHIFT_API_PRIVILEGES,
  NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES,
} from '@kbn/nightshift-shared';
import {
  investigationQuotaRoutes,
  investigationQuotasUpdateBodySchema,
} from './investigation_quotas';

const getRoute = investigationQuotaRoutes['GET /internal/nightshift/investigation_quotas'];
const putRoute = investigationQuotaRoutes['PUT /internal/nightshift/investigation_quotas'];

describe('investigationQuotaRoutes', () => {
  it('lets a reader see the limits and requires manage and configure to change them', () => {
    const getAuthz = getRoute.security.authz;
    const putAuthz = putRoute.security.authz;

    expect('requiredPrivileges' in getAuthz && getAuthz.requiredPrivileges).toEqual([
      NIGHTSHIFT_API_PRIVILEGES.read,
    ]);
    expect('requiredPrivileges' in putAuthz && putAuthz.requiredPrivileges).toEqual(
      NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES
    );
  });
});

describe('investigationQuotasUpdateBodySchema', () => {
  const accepts = (body: unknown) => investigationQuotasUpdateBodySchema.safeParse(body).success;

  it('accepts a switch change, a limit change and a removed limit', () => {
    expect(accepts({ enabled: false })).toBe(true);
    expect(accepts({ limits: { manual_investigation: 7 } })).toBe(true);
    expect(accepts({ limits: { automatic_investigation: null } })).toBe(true);
    expect(accepts({ enabled: true, limits: { total_investigation: MAX_RUN_LIMIT } })).toBe(true);
  });

  it('rejects a limit of 0, because null is the only way to remove a limit', () => {
    expect(accepts({ limits: { manual_investigation: 0 } })).toBe(false);
  });

  it('rejects limits that are not whole numbers or above the maximum', () => {
    expect(accepts({ limits: { manual_investigation: 1.5 } })).toBe(false);
    expect(accepts({ limits: { manual_investigation: MAX_RUN_LIMIT + 1 } })).toBe(false);
  });

  it('rejects an update that changes nothing', () => {
    expect(accepts({})).toBe(false);
    expect(accepts({ limits: {} })).toBe(false);
    expect(accepts({ limits: { manual_investigation: undefined } })).toBe(false);
  });

  it('rejects unknown settings and groups, including the retired group name', () => {
    expect(accepts({ enabled: true, investigationLimitsEnabled: true })).toBe(false);
    expect(accepts({ limits: { investigation: 3 } })).toBe(false);
    expect(accepts({ limits: { detection: 3 } })).toBe(false);
  });
});
