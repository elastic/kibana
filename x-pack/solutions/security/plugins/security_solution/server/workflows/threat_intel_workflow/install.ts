/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import {
  THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID,
  THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
  THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
  THREAT_INTEL_WORKFLOW_IDS,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { SecurityManagedWorkflowsClient } from '../managed_workflows';

const THREAT_INTEL_DEFINITION_IDS: ReadonlySet<string> = new Set(THREAT_INTEL_WORKFLOW_IDS);

const THREAT_INTEL_SUPPLY_WORKFLOW_IDS = [
  THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
  THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
] as const;

/**
 * Uninstalls one workflow, tolerating failure so a partial prior install still
 * cleans up. Not-found is quiet: the managed client returns early when no
 * document is stored, so this catch never fires on the steady state. The
 * flag-off path gets here only after the leftover probe decided something is
 * installed, so a 403/5xx is the "workflows keep running against alerts" case.
 * Warn so a production boot is not silent.
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
 * Removes the legacy global copy of a supply workflow so the default-space install can create it.
 * Returns false when the removal fails. A failed uninstall does not say where the document lives
 * (it may already be in the default space and only the legacy lookup failed), so both locations are
 * re-installed to keep `id:*` and `id:default` tracked this boot. The install tracks its key before
 * it touches the document, so whichever copy exists is kept and the other attempt can only 409
 * on the shared `_id`, which is expected and ignored. `ready()` then never treats either as an
 * orphan. The caller skips its own default-space install, and the move is retried on the next boot.
 */
const removeLegacyGlobalSupplyWorkflow = async (
  managedWorkflowsClient: SecurityManagedWorkflowsClient,
  workflowId: (typeof THREAT_INTEL_SUPPLY_WORKFLOW_IDS)[number],
  logger: Logger
): Promise<boolean> => {
  try {
    await managedWorkflowsClient.uninstall(workflowId, { spaceId: GLOBAL_WORKFLOW_SPACE_ID });
    return true;
  } catch (error) {
    logger.warn(
      `Failed to remove the legacy global copy of the threat intel supply workflow ${workflowId}; ` +
        `keeping the existing copy for this boot and retrying the move to the default space on the next boot`,
      { error }
    );
    for (const spaceId of [GLOBAL_WORKFLOW_SPACE_ID, DEFAULT_SPACE_ID]) {
      try {
        await managedWorkflowsClient.install(workflowId, { spaceId });
      } catch (installError) {
        logger.debug(
          `Expected conflict while tracking the threat intel supply workflow ${workflowId} in space '${spaceId}'`,
          { error: installError }
        );
      }
    }
    return false;
  }
};

/**
 * Hybrid install: ingest + enrich once in the default space (source catalog and
 * enrichment are shared by every space, but scheduled triggers only register for a
 * real space), attribute_alerts_to_reports once per real Kibana space (alerts
 * and hit counts are space-scoped).
 *
 * Earlier releases installed ingest + enrich in the global workflow space, so
 * each one is uninstalled there first. The workflow `_id` is unique per index
 * regardless of space and the install creates with `op_type: 'create'`, so
 * installing into the default space while the old doc exists would 409.
 *
 * Every install is isolated so one failure cannot cancel the rest. A bare
 * `await` in a loop meant a single failing space (or a failing supply install)
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
  for (const workflowId of THREAT_INTEL_SUPPLY_WORKFLOW_IDS) {
    try {
      const legacyRemoved = await removeLegacyGlobalSupplyWorkflow(
        managedWorkflowsClient,
        workflowId,
        logger
      );
      if (legacyRemoved) {
        await managedWorkflowsClient.install(workflowId, { spaceId: DEFAULT_SPACE_ID });
      }
    } catch (error) {
      logger.warn(
        `Failed to install the threat intel supply workflow ${workflowId} in the default space`,
        { error }
      );
    }
  }

  await reconcileThreatIntelAttributeWorkflows({
    managedWorkflowsClient,
    spaceIds,
    logger,
  });
};

/**
 * Installs the TI supply workflows once in the default space and the per-space
 * attribute workflow for one space. Failures propagate so Hunt ensure can surface them; unlike the
 * boot installer this does not swallow per-workflow errors.
 *
 * Called from AlertZero when Hunt enable finds a required TI document missing
 * (for example a space created after boot whose attribute workflow has not been
 * installed by the promote task yet).
 */
export const ensureThreatIntelSupplyWorkflowsForSpace = async ({
  managedWorkflowsClient,
  spaceId,
}: {
  managedWorkflowsClient: SecurityManagedWorkflowsClient;
  spaceId: string;
}): Promise<void> => {
  for (const workflowId of THREAT_INTEL_SUPPLY_WORKFLOW_IDS) {
    await managedWorkflowsClient.uninstall(workflowId, { spaceId: GLOBAL_WORKFLOW_SPACE_ID });
    await managedWorkflowsClient.install(workflowId, { spaceId: DEFAULT_SPACE_ID });
  }

  await managedWorkflowsClient.install(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID, {
    spaceId,
    workflowIdSuffix: spaceId,
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
 * True when any threat-intel managed workflow is still persisted for this
 * plugin — the two default-space supply workflows or a per-space attribute instance. The client list
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
 * Removes the two default-space TI supply workflows (and any legacy copy in the
 * global workflow space) and every per-space attribute instance.
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

  for (const workflowId of THREAT_INTEL_SUPPLY_WORKFLOW_IDS) {
    await uninstallTolerant(
      managedWorkflowsClient,
      workflowId,
      { spaceId: DEFAULT_SPACE_ID },
      logger
    );
    // Legacy location, so a flag-off boot on an un-migrated deployment still cleans up.
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
