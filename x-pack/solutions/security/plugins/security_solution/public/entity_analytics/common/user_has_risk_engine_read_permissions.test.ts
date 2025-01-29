/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { userHasRiskEngineReadPermissions } from './user_has_risk_engine_read_permissions';

describe('userHasRiskEngineReadPermissions', () => {
  it('returns false if isLoading is true', () => {
    expect(userHasRiskEngineReadPermissions({ isLoading: true })).toEqual(false);
  });
  it('returns true if hasAllRequiredPrivileges is true', () => {
    expect(
      userHasRiskEngineReadPermissions({ isLoading: false, hasAllRequiredPrivileges: true })
    ).toEqual(true);
  });
  it('returns false if hasAllRequiredPrivileges is false and user is missing read permissions', () => {
    expect(
      userHasRiskEngineReadPermissions({
        isLoading: false,
        hasAllRequiredPrivileges: false,
        missingPrivileges: {
          clusterPrivileges: [],
          indexPrivileges: [['risk-score.risk-score-*', ['read']]],
        },
      })
    ).toEqual(false);
  });

  it('returns true if hasAllRequiredPrivileges is false and user is missing read permissions for other index', () => {
    expect(
      userHasRiskEngineReadPermissions({
        isLoading: false,
        hasAllRequiredPrivileges: false,
        missingPrivileges: {
          clusterPrivileges: [],
          indexPrivileges: [['other-index.other-index-*', ['read']]],
        },
      })
    ).toEqual(true);
  });

  it('returns true if hasAllRequiredPrivileges is false and user is not missing read permissions', () => {
    expect(
      userHasRiskEngineReadPermissions({
        isLoading: false,
        hasAllRequiredPrivileges: false,
        missingPrivileges: {
          clusterPrivileges: [],
          indexPrivileges: [['risk-score.risk-score-*', ['write']]],
        },
      })
    ).toEqual(true);
  });
});
