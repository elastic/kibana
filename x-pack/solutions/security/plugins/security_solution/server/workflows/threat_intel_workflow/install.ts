/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID,
  THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
  THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { SecurityManagedWorkflowsClient } from '../managed_workflows';

const GLOBAL_THREAT_INTEL_WORKFLOW_IDS = [
  THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
  THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
] as const;

/**
 * Hybrid install: ingest + enrich once in the global workflow space (source
 * catalog and enrichment are content-global), attribute_alerts_to_reports once
 * per real Kibana space (alerts and hit counts are space-scoped).
 */
export const installThreatIntelManagedWorkflows = async ({
  managedWorkflowsClient,
  spaceIds,
}: {
  managedWorkflowsClient: SecurityManagedWorkflowsClient;
  spaceIds: readonly string[];
}): Promise<void> => {
  for (const workflowId of GLOBAL_THREAT_INTEL_WORKFLOW_IDS) {
    await managedWorkflowsClient.install(workflowId, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    });
  }

  await reconcileThreatIntelAttributeWorkflows({
    managedWorkflowsClient,
    spaceIds,
  });
};

/**
 * Idempotent per-space install of attribute_alerts_to_reports. Used at boot and
 * by the promote task to catch spaces created after the last install pass.
 */
export const reconcileThreatIntelAttributeWorkflows = async ({
  managedWorkflowsClient,
  spaceIds,
}: {
  managedWorkflowsClient: SecurityManagedWorkflowsClient;
  spaceIds: readonly string[];
}): Promise<void> => {
  for (const spaceId of spaceIds) {
    await managedWorkflowsClient.install(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID, {
      spaceId,
      workflowIdSuffix: spaceId,
    });
  }
};

/** Uninstalls one workflow, tolerating not-found so a partial prior install still cleans up. */
const uninstallTolerant = async (
  managedWorkflowsClient: SecurityManagedWorkflowsClient,
  workflowId: string,
  options: { spaceId: string; workflowIdSuffix?: string }
): Promise<void> => {
  try {
    await managedWorkflowsClient.uninstall(workflowId, options);
  } catch {
    // tolerate not-found / already-gone
  }
};

/**
 * Removes the two global TI workflows and every per-space attribute instance.
 * Tolerates not-found so a partial prior install still cleans up.
 */
export const uninstallThreatIntelManagedWorkflows = async ({
  managedWorkflowsClient,
  spaceIds,
}: {
  managedWorkflowsClient: SecurityManagedWorkflowsClient;
  spaceIds: readonly string[];
}): Promise<void> => {
  for (const workflowId of GLOBAL_THREAT_INTEL_WORKFLOW_IDS) {
    await uninstallTolerant(managedWorkflowsClient, workflowId, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    });
  }

  for (const spaceId of spaceIds) {
    await uninstallTolerant(managedWorkflowsClient, THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID, {
      spaceId,
      workflowIdSuffix: spaceId,
    });
  }
};
