/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin/common';
import { getRuleAuthor } from './rule_author';
import { getT3Analyst } from './t3_analyst';
import { getT1Analyst } from './t1_analyst';
import { getT2Analyst } from './t2_analyst';
import { getHunter } from './hunter';
import { getThreatIntelligenceAnalyst } from './threat_intelligence_analyst';
import { getSocManager } from './soc_manager';
import { getPlatformEngineer } from './platform_engineer';
import { getEndpointOperationsAnalyst } from './endpoint_operations_analyst';
import {
  getEndpointSecurityPolicyManagementReadRole,
  getEndpointSecurityPolicyManager,
} from './endpoint_security_policy_manager';
import { getDetectionsEngineer } from './detections_engineer';
import { getWithResponseActionsRole } from './with_response_actions_role';
import { getNoResponseActionsRole } from './without_response_actions_role';
import { getWithArtifactReadPrivilegesRole } from './with_artifact_read_privileges_role';

export * from './with_response_actions_role';
export * from './without_response_actions_role';
export * from './t1_analyst';
export * from './t2_analyst';
export * from './t3_analyst';
export * from './hunter';
export * from './threat_intelligence_analyst';
export * from './soc_manager';
export * from './platform_engineer';
export * from './endpoint_operations_analyst';
export * from './endpoint_security_policy_manager';
export * from './detections_engineer';

export type EndpointSecurityRoleNames = keyof typeof ENDPOINT_SECURITY_ROLE_NAMES;

export type EndpointSecurityRoleDefinitions = Record<EndpointSecurityRoleNames, Role>;

/**
 * Security Solution set of roles that are loaded and used in serverless deployments.
 * The source of these role definitions is under `project-controller` at:
 *
 * @see https://github.com/elastic/project-controller/blob/main/internal/project/security/config/roles.yml
 *
 * The role definition spreadsheet can be found here:
 *
 * @see https://docs.google.com/spreadsheets/d/16aGow187AunLCBFZLlbVyS81iQNuMpNxd96LOerWj4c/edit#gid=1936689222
 */
export const SECURITY_SERVERLESS_ROLE_NAMES = Object.freeze({
  t1_analyst: 't1_analyst',
  t2_analyst: 't2_analyst',
  t3_analyst: 't3_analyst',
  threat_intelligence_analyst: 'threat_intelligence_analyst',
  rule_author: 'rule_author',
  soc_manager: 'soc_manager',
  detections_admin: 'detections_admin',
  platform_engineer: 'platform_engineer',
  endpoint_operations_analyst: 'endpoint_operations_analyst',
  endpoint_policy_manager: 'endpoint_policy_manager',
});

export const ENDPOINT_SECURITY_ROLE_NAMES = Object.freeze({
  // --------------------------------------
  // Set of roles used in serverless
  ...SECURITY_SERVERLESS_ROLE_NAMES,

  // --------------------------------------
  // Other roles used for testing
  hunter: 'hunter',
  endpoint_response_actions_access: 'endpoint_response_actions_access',
  endpoint_response_actions_no_access: 'endpoint_response_actions_no_access',
  endpoint_security_policy_management_read: 'endpoint_security_policy_management_read',
  artifact_read_privileges: 'artifact_read_privileges',
});

export const getAllEndpointSecurityRoles = (): EndpointSecurityRoleDefinitions => {
  return {
    t1_analyst: {
      ...getT1Analyst(),
      name: 't1_analyst',
    },
    t2_analyst: {
      ...getT2Analyst(),
      name: 't2_analyst',
    },
    t3_analyst: {
      ...getT3Analyst(),
      name: 't3_analyst',
    },
    threat_intelligence_analyst: {
      ...getThreatIntelligenceAnalyst(),
      name: 'threat_intelligence_analyst',
    },
    rule_author: {
      ...getRuleAuthor(),
      name: 'rule_author',
    },
    soc_manager: {
      ...getSocManager(),
      name: 'soc_manager',
    },
    detections_admin: {
      ...getDetectionsEngineer(),
      name: 'detections_admin',
    },
    platform_engineer: {
      ...getPlatformEngineer(),
      name: 'platform_engineer',
    },
    endpoint_operations_analyst: {
      ...getEndpointOperationsAnalyst(),
      name: 'endpoint_operations_analyst',
    },
    endpoint_policy_manager: {
      ...getEndpointSecurityPolicyManager(),
      name: 'endpoint_policy_manager',
    },

    hunter: {
      ...getHunter(),
      name: 'hunter',
    },
    endpoint_response_actions_access: {
      ...getWithResponseActionsRole(),
      name: 'endpoint_response_actions_access',
    },
    endpoint_response_actions_no_access: {
      ...getNoResponseActionsRole(),
      name: 'endpoint_response_actions_no_access',
    },
    endpoint_security_policy_management_read: {
      ...getEndpointSecurityPolicyManagementReadRole(),
      name: 'endpoint_security_policy_management_read',
    },
    artifact_read_privileges: {
      ...getWithArtifactReadPrivilegesRole(),
      name: 'artifact_read_privileges',
    },
  };
};
