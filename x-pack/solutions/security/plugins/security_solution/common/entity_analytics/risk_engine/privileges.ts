/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NonEmptyArray } from 'fp-ts/NonEmptyArray';
import type { EntityAnalyticsPrivileges } from '../../api/entity_analytics';
import type { RiskEngineIndexPrivilege } from './constants';
import {
  TO_ENABLE_RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES,
  TO_RUN_RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES,
  RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES,
} from './constants';

export interface MissingClusterPrivileges {
  enable: string[];
  run: string[];
}
export type MissingIndexPrivileges = Array<readonly [indexName: string, privileges: string[]]>;

export interface MissingPrivileges {
  clusterPrivileges: MissingClusterPrivileges;
  indexPrivileges: MissingIndexPrivileges;
}

export const getMissingIndexPrivileges = (
  privileges: EntityAnalyticsPrivileges['privileges']['elasticsearch']['index'],
  required: NonEmptyArray<RiskEngineIndexPrivilege> = ['read', 'write']
): MissingIndexPrivileges => {
  const missingIndexPrivileges: MissingIndexPrivileges = [];

  if (!privileges) {
    return missingIndexPrivileges;
  }

  for (const [indexName, defaultRequiredPrivileges] of Object.entries(
    RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES
  )) {
    const missingPrivileges = (required || defaultRequiredPrivileges).filter(
      (privilege) => !privileges[indexName][privilege]
    );

    if (missingPrivileges.length) {
      missingIndexPrivileges.push([indexName, missingPrivileges]);
    }
  }

  return missingIndexPrivileges;
};

export const getMissingRiskEnginePrivileges = (
  privileges: EntityAnalyticsPrivileges['privileges'],
  required?: NonEmptyArray<RiskEngineIndexPrivilege>
): MissingPrivileges => {
  const missingIndexPrivileges = getMissingIndexPrivileges(
    privileges.elasticsearch.index,
    required
  );
  const missingClusterPrivilegesToEnableEngine =
    TO_ENABLE_RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES.filter(
      (privilege) => !privileges.elasticsearch.cluster?.[privilege]
    );
  const missingClusterPrivilegesToRunEngine =
    TO_RUN_RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES.filter(
      (privilege) => !privileges.elasticsearch.cluster?.[privilege]
    );

  return {
    indexPrivileges: missingIndexPrivileges,
    clusterPrivileges: {
      enable: missingClusterPrivilegesToEnableEngine,
      run: missingClusterPrivilegesToRunEngine,
    },
  };
};
