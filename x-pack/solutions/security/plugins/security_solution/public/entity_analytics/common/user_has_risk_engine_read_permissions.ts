/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RISK_SCORE_INDEX_PATTERN } from '../../../common/entity_analytics/risk_engine';
import type { RiskEngineMissingPrivilegesResponse } from '../hooks/use_missing_risk_engine_privileges';

export const userHasRiskEngineReadPermissions = (
  privileges: RiskEngineMissingPrivilegesResponse
): boolean => {
  if (privileges.isLoading) {
    return false;
  }

  if (privileges.hasAllRequiredPrivileges) {
    return true;
  }

  const { indexPrivileges: missingIndexPrivileges } = privileges.missingPrivileges;

  const isMissingReadPrivilege = missingIndexPrivileges.find(
    ([indexName, indexPrivileges]) =>
      indexName === RISK_SCORE_INDEX_PATTERN && indexPrivileges.includes('read')
  );

  return !isMissingReadPrivilege;
};
