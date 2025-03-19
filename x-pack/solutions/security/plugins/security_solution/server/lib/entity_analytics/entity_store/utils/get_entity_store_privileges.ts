/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { SO_ENTITY_DEFINITION_TYPE } from '@kbn/entityManager-plugin/server/saved_objects';
import { RISK_SCORE_INDEX_PATTERN } from '../../../../../common/constants';
import {
  ENTITY_STORE_INDEX_PATTERN,
  ENTITY_STORE_REQUIRED_ES_CLUSTER_PRIVILEGES,
  ENTITY_STORE_SOURCE_REQUIRED_ES_INDEX_PRIVILEGES,
} from '../../../../../common/entity_analytics/entity_store/constants';
import { checkAndFormatPrivileges } from '../../utils/check_and_format_privileges';
import { entityEngineDescriptorTypeName } from '../saved_object';

export const getEntityStorePrivileges = (
  request: KibanaRequest,
  security: SecurityPluginStart,
  securitySolutionIndices: string[]
) => {
  // The entity store needs access to all security solution indices
  const indicesPrivileges = getEntityStoreSourceRequiredIndicesPrivileges(securitySolutionIndices);

  // The entity store has to create the following indices
  indicesPrivileges[ENTITY_STORE_INDEX_PATTERN] = ['read', 'manage'];
  indicesPrivileges[RISK_SCORE_INDEX_PATTERN] = ['read', 'manage'];

  return checkAndFormatPrivileges({
    request,
    security,
    privilegesToCheck: {
      kibana: [
        security.authz.actions.savedObject.get(entityEngineDescriptorTypeName, 'create'),
        security.authz.actions.savedObject.get(SO_ENTITY_DEFINITION_TYPE, 'create'),
      ],
      elasticsearch: {
        cluster: ENTITY_STORE_REQUIRED_ES_CLUSTER_PRIVILEGES,
        index: indicesPrivileges,
      },
    },
  });
};

// Get the index privileges required for running the transform
export const getEntityStoreSourceIndicesPrivileges = (
  request: KibanaRequest,
  security: SecurityPluginStart,
  indexPatterns: string[]
) => {
  const requiredIndicesPrivileges = getEntityStoreSourceRequiredIndicesPrivileges(indexPatterns);

  return checkAndFormatPrivileges({
    request,
    security,
    privilegesToCheck: {
      elasticsearch: {
        cluster: [],
        index: requiredIndicesPrivileges,
      },
    },
  });
};

const getEntityStoreSourceRequiredIndicesPrivileges = (securitySolutionIndices: string[]) => {
  return securitySolutionIndices.reduce<Record<string, string[]>>((acc, index) => {
    acc[index] = ENTITY_STORE_SOURCE_REQUIRED_ES_INDEX_PRIVILEGES;
    return acc;
  }, {});
};
