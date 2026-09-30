/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID,
  THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
  THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
  THREAT_INTEL_WORKFLOW_IDS,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { SecurityManagedWorkflowsClient } from '../managed_workflows';

const THREAT_INTEL_DEFINITION_IDS: ReadonlySet<string> = new Set(THREAT_INTEL_WORKFLOW_IDS);

const GLOBAL_THREAT_INTEL_WORKFLOW_IDS = [
  THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
  THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
] as const;

/**
 * Hybrid install: ingest + enrich once in the global workflow space (source
 * catalog and enrichment are content-global), attribute_alerts_to_reports once
 * per real Kibana space (alerts and hit counts are space-scoped).
 *
 * Every install is isolated so one failure cannot cancel the rest. A bare
 * `await` in a loop meant a single failing space (or a failing global install)
 * stopped every install after it, on every pass, and the error was swallowed by
 * a `warn` in the caller — so a partly-installed deployment looked fully
 * covered.
 */
export const installThreatIntelManagedWorkflows = async ({
  managedWorkflowsClient,
  spaceIds,
  logger,
}: {
  managedWorkflowsClient: SecurityManagedWorkflowsClient;
  spaceIds: readonly string[];
  logger: Logger;
}): Promise<void> => {
  for (const workflowId of GLOBAL_THREAT_INTEL_WORKFLOW_IDS) {
    try {
      await managedWorkflowsClient.install(workflowId, {
        spaceId: GLOBAL_WORKFLOW_SPACE_ID,
      });
    } catch (error) {
      logger.warn(`Failed to install the global threat intel workflow ${workflowId}`, { error });
    }
  }

  await reconcileThreatIntelAttributeWorkflows({
    managedWorkflowsClient,
    spaceIds,
    logger,
  });
};

/**
 * Idempotent per-space install of attribute_alerts_to_reports. Used at boot and
 * by the promote task to catch spaces created after the last install pass.
 */
export const reconcileThreatIntelAttributeWorkflows = async ({
  managedWorkflowsClient,
  spaceIds,
  logger,
}: {
  managedWorkflowsClient: SecurityManagedWorkflowsClient;
  spaceIds: readonly string[];
  logger: Logger;
}): Promise<void> => {
  const failedSpaceIds: string[] = [];

  for (const spaceId of spaceIds) {
    try {
      await managedWorkflowsClient.install(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID, {
        spaceId,
        workflowIdSuffix: spaceId,
      });
    } catch (error) {
      failedSpaceIds.push(spaceId);
      logger.warn(
        `Failed to install ${THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID} in space '${spaceId}'`,
        { error }
      );
    }
  }

  if (failedSpaceIds.length > 0) {
    logger.warn(
      `${failedSpaceIds.length} of ${spaceIds.length} space(s) have no ` +
        `${THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID} workflow, so their alerts are not attributed ` +
        `to threat reports: ${failedSpaceIds.join(', ')}. The promote task retries on its next run.`
    );
  }
};

/**
 * Uninstalls one workflow, tolerating not-found so a partial prior install still
 * cleans up. This helper is only reached after the leftover probe decided
 * something is installed; a 403/5xx here is the "workflows keep running against
 * alerts" case. Warn so a production flag-off boot is not silent. The quiet
 * never-installed path is the probe short-circuit, not this catch.
 */
const uninstallTolerant = async (
  managedWorkflowsClient: SecurityManagedWorkflowsClient,
  workflowId: Parameters<SecurityManagedWorkflowsClient['uninstall']>[0],
  options: Parameters<SecurityManagedWorkflowsClient['uninstall']>[1],
  logger: Logger
): Promise<void> => {
  try {
    await managedWorkflowsClient.uninstall(workflowId, options);
  } catch (error) {
    logger.warn(
      `Failed to uninstall the threat intel workflow ${workflowId} in space '${options.spaceId}'`,
      { error }
    );
  }
};

/**
 * True when any threat-intel managed workflow is still persisted for this
 * plugin — the two globals or a per-space attribute instance. The client list
 * is plugin-scoped, so it also contains alert-analysis; only TI definition
 * (or suffixed document) ids count. On a deployment that never turned the
 * supply flag on the list has none of those, letting
 * `uninstallThreatIntelManagedWorkflows` skip space enumeration and every
 * per-space uninstall call instead of paying N+3 no-op requests on every boot.
 */
const isThreatIntelWorkflowInstance = ({
  definitionId,
  workflowId,
}: {
  definitionId: string | null;
  workflowId: string;
}): boolean => {
  if (definitionId != null) {
    return THREAT_INTEL_DEFINITION_IDS.has(definitionId);
  }
  return THREAT_INTEL_WORKFLOW_IDS.some(
    (id) => workflowId === id || workflowId.startsWith(`${id}-`)
  );
};

const hasAnyThreatIntelWorkflowInstalled = async (
  managedWorkflowsClient: SecurityManagedWorkflowsClient
): Promise<boolean> => {
  const states = await managedWorkflowsClient.listInstalledWorkflowStates();
  return states.some(isThreatIntelWorkflowInstance);
};

/**
 * Removes the two global TI workflows and every per-space attribute instance.
 * Tolerates not-found so a partial prior install still cleans up. Short-circuits
 * before enumerating spaces when no TI instance is installed, since that is the
 * steady state for every deployment that never had the supply flag on.
 * Otherwise a 100-space deployment pays 103 sequential no-op calls on every
 * restart just to confirm there is nothing to remove.
 */
export const uninstallThreatIntelManagedWorkflows = async ({
  managedWorkflowsClient,
  getSpaceIds,
  logger,
}: {
  managedWorkflowsClient: SecurityManagedWorkflowsClient;
  getSpaceIds: () => Promise<readonly string[]>;
  logger: Logger;
}): Promise<void> => {
  if (!(await hasAnyThreatIntelWorkflowInstalled(managedWorkflowsClient))) {
    return;
  }

  for (const workflowId of GLOBAL_THREAT_INTEL_WORKFLOW_IDS) {
    await uninstallTolerant(
      managedWorkflowsClient,
      workflowId,
      { spaceId: GLOBAL_WORKFLOW_SPACE_ID },
      logger
    );
  }

  const spaceIds = await getSpaceIds();
  for (const spaceId of spaceIds) {
    await uninstallTolerant(
      managedWorkflowsClient,
      THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID,
      { spaceId, workflowIdSuffix: spaceId },
      logger
    );
  }
};
