/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { KibanaRequest } from '@kbn/core/server';
import { ENTITY_ANALYTICS_KIBANA_FEATURE_PRIVILEGES } from '@kbn/entity-store/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

/**
 * Checks the same Kibana feature privileges the entity_store resolution HTTP routes require
 */
export const checkResolutionAccess = async ({
  request,
  security,
  action,
}: {
  request: KibanaRequest;
  security: SecurityPluginStart;
  action: string;
}): Promise<{ allowed: true } | { allowed: false; result: ErrorResult }> => {
  const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
  const { hasAllRequested } = await checkPrivileges({
    kibana: ENTITY_ANALYTICS_KIBANA_FEATURE_PRIVILEGES.map((privilege) =>
      security.authz.actions.api.get(privilege)
    ),
  });

  if (hasAllRequested) {
    return { allowed: true };
  }

  return {
    allowed: false,
    result: {
      tool_result_id: getToolResultId(),
      type: ToolResultType.error,
      data: {
        message: `You do not have permission to ${action} in this space.`,
      },
    },
  };
};
