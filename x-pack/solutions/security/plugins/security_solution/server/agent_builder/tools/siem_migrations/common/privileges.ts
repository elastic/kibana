/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { SIEM_MIGRATIONS_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import { RULES_API_READ } from '@kbn/security-solution-features/constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';

/**
 * Runtime, per-request privilege check for mutating Automatic Migration actions.
 *
 * Capabilities do not resolve in Task-Manager-executed chat rounds, so `checkPrivileges`
 * (not UI capabilities) is required — mirrors create_detection_rule_tool.ts. The endpoint also
 * enforces API-level authz via the selfClient call, so this is a defense-in-depth gate that lets
 * the agent explain the missing permission instead of failing.
 *
 * Returns `true` when the current user can perform all SIEM migration operations.
 */
export const hasSiemMigrationPrivileges = async (
  core: SecuritySolutionPluginCoreSetupDependencies,
  request: KibanaRequest,
  additionalPrivileges: readonly string[] = []
): Promise<boolean> => {
  const [, startPlugins] = await core.getStartServices();
  const { authz } = startPlugins.security;
  const checkPrivileges = authz.checkPrivilegesDynamicallyWithRequest(request);
  const { hasAllRequested } = await checkPrivileges({
    kibana: [SIEM_MIGRATIONS_API_ACTION_ALL, ...additionalPrivileges].map((privilege) =>
      authz.actions.api.get(privilege)
    ),
  });
  return hasAllRequested;
};

export const hasRuleMigrationPrivileges = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  request: KibanaRequest,
  additionalPrivileges: readonly string[] = []
): Promise<boolean> =>
  hasSiemMigrationPrivileges(core, request, [RULES_API_READ, ...additionalPrivileges]);
