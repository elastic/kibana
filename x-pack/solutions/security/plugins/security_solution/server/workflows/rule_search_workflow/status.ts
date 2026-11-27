/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { SECURITY_RULE_SEARCH_INDEX_WORKFLOW_ID } from '@kbn/workflows/managed';
import { initSecurityManagedWorkflowsClient } from '../managed_workflows';

/** Every search asks; an admin's switch shows up within this time. */
const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { at: number; enabled: boolean | undefined }>();

/**
 * Whether the admin turned the rule search index workflow on in the space: that is the switch for
 * search by meaning. `undefined` when Workflows is not available (license, serverless tier).
 */
export const isRuleSearchWorkflowEnabled = async (
  workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined,
  spaceId: string
): Promise<boolean | undefined> => {
  if (!workflowsExtensions) {
    return undefined;
  }
  const cached = cache.get(spaceId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.enabled;
  }
  let enabled: boolean | undefined;
  try {
    const managed = await initSecurityManagedWorkflowsClient(workflowsExtensions);
    const report = await managed.getWorkflowStatus(SECURITY_RULE_SEARCH_INDEX_WORKFLOW_ID, {
      spaceId,
      workflowIdSuffix: spaceId,
    });
    enabled = report.installed && report.enabled === true;
  } catch {
    enabled = undefined;
  }
  cache.set(spaceId, { at: Date.now(), enabled });
  return enabled;
};
