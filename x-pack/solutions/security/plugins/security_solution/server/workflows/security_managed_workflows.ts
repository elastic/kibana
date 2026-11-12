/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import {
  AESOP_AB_COMPARE_WORKFLOW_ID,
  AESOP_DRIFT_MONITOR_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { installSecurityAlertAnalysisWorkflow } from './alert_analysis_workflow/install';
import {
  initSecurityManagedWorkflowsClient,
  type SecurityManagedWorkflowsClient,
} from './managed_workflows';
import {
  installThreatIntelManagedWorkflows,
  reconcileThreatIntelAttributeWorkflows,
  uninstallThreatIntelManagedWorkflows,
} from './threat_intel_workflow/install';
import { enumerateSpaceIds } from './lib/enumerate_space_ids';

/**
 * Single plugin-start entry for securitySolution managed workflows: install alert
 * analysis (always), install or uninstall threat-intel workflows when AlertZero
 * is on/off, then call `ready()` exactly once. Replaces the two prior
 * AndMarkReady helpers that each called `ready()` and raced each other.
 */
export const installSecurityManagedWorkflowsAndMarkReady = async ({
  workflowsExtensions,
  logger,
  threatIntelSupplyEnabled,
  aesopPrototypeEnabled,
  bootstrapReady,
  core,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  logger: Logger;
  /**
   * True when `xpack.alertzero.enabled` is on (captured from the optional
   * alertzero setup contract). When false, any previously installed TI
   * managed workflows are uninstalled.
   */
  threatIntelSupplyEnabled: boolean;
  /**
   * True when the `aesopPrototypeEnabled` experimental flag is on. When
   * false, any previously installed AESOP prototype workflows are
   * uninstalled.
   */
  aesopPrototypeEnabled: boolean;
  /**
   * Resolves after TI bootstrap (templates, migrations, seed). Only awaited when
   * supply is enabled; ignored otherwise.
   */
  bootstrapReady: Promise<void>;
  core: Pick<CoreStart, 'savedObjects'>;
}): Promise<void> => {
  let managedWorkflowsClient: SecurityManagedWorkflowsClient;
  try {
    managedWorkflowsClient = await initSecurityManagedWorkflowsClient(workflowsExtensions);
  } catch (error) {
    logger.warn('Failed to initialize the securitySolution managed-workflows client', { error });
    return;
  }

  try {
    await installSecurityAlertAnalysisWorkflow({ managedWorkflowsClient });
  } catch (error) {
    logger.warn('Failed to install the alert analysis workflow', { error });
  }

  try {
    // AESOP prototype: only the A/B compare workflow installs at boot (static
    // lifecycle, global space). The drift monitor is a template definition
    // instantiated per skill when a variant deploys; installing it here would
    // need `values` the boot has no business inventing. Flag-off cleanup
    // uninstalls any per-skill instances the reconciliation sweep finds.
    if (aesopPrototypeEnabled) {
      await managedWorkflowsClient.install(AESOP_AB_COMPARE_WORKFLOW_ID, {
        spaceId: GLOBAL_WORKFLOW_SPACE_ID,
      });
    } else {
      await managedWorkflowsClient.uninstall(AESOP_AB_COMPARE_WORKFLOW_ID, {
        spaceId: GLOBAL_WORKFLOW_SPACE_ID,
      });
      const instances = await managedWorkflowsClient.listInstalledWorkflowStates();
      await Promise.all(
        instances
          .filter((instance) => instance.definitionId === AESOP_DRIFT_MONITOR_WORKFLOW_ID)
          .map((instance) =>
            managedWorkflowsClient.uninstall(AESOP_DRIFT_MONITOR_WORKFLOW_ID, {
              spaceId: instance.spaceId,
              workflowId: instance.workflowId,
            })
          )
      );
    }
  } catch (error) {
    logger.warn('Failed to install or uninstall the AESOP prototype workflows', { error });
  }

  try {
    if (threatIntelSupplyEnabled) {
      await bootstrapReady;
      const spaceIds = await enumerateSpaceIds(createSpaceRepository(core));
      await installThreatIntelManagedWorkflows({
        managedWorkflowsClient,
        spaceIds,
        logger,
      });
    } else {
      await uninstallThreatIntelManagedWorkflows({
        managedWorkflowsClient,
        getSpaceIds: () => enumerateSpaceIds(createSpaceRepository(core)),
        logger,
      });
    }
  } catch (error) {
    logger.warn('Failed to install or uninstall threat intelligence managed workflows', {
      error,
    });
  }

  try {
    await managedWorkflowsClient.ready();
  } catch (error) {
    logger.warn('Failed to mark securitySolution managed workflows ready', { error });
  }
};

/**
 * Periodic catch-up for spaces created after boot. Installs only
 * `attribute_alerts_to_reports` per missing space (ingest/enrich live in the default space).
 * Intended to ride the promote_threat_indicators task every 15m.
 */
export const reconcileThreatIntelAttributeWorkflowsForSpaces = async ({
  workflowsExtensions,
  core,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  core: Pick<CoreStart, 'savedObjects'>;
  logger: Logger;
}): Promise<void> => {
  try {
    const managedWorkflowsClient = await initSecurityManagedWorkflowsClient(workflowsExtensions);
    const spaceIds = await enumerateSpaceIds(createSpaceRepository(core));
    await reconcileThreatIntelAttributeWorkflows({
      managedWorkflowsClient,
      spaceIds,
      logger,
    });
  } catch (error) {
    logger.warn('Failed to reconcile per-space threat intel attribute workflows', { error });
  }
};

/**
 * Full TI managed-workflow install (default-space supply workflows + per-space attribute) for every
 * current space. Used when bootstrap recovers after the boot-time installer
 * skipped TI because `bootstrapReady` had rejected.
 */
export const installThreatIntelManagedWorkflowsForSpaces = async ({
  workflowsExtensions,
  core,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  core: Pick<CoreStart, 'savedObjects'>;
  logger: Logger;
}): Promise<void> => {
  try {
    const managedWorkflowsClient = await initSecurityManagedWorkflowsClient(workflowsExtensions);
    const spaceIds = await enumerateSpaceIds(createSpaceRepository(core));
    await installThreatIntelManagedWorkflows({
      managedWorkflowsClient,
      spaceIds,
      logger,
    });
  } catch (error) {
    logger.warn(
      'Failed to install threat intelligence managed workflows after bootstrap recovery',
      {
        error,
      }
    );
    // Rethrow so the background recovery loop can retry. Swallowing here left TI
    // workflows missing until restart after a transient install failure.
    throw error;
  }
};

const createSpaceRepository = (
  core: Pick<CoreStart, 'savedObjects'>
): Pick<SavedObjectsClientContract, 'find'> =>
  core.savedObjects.createInternalRepository(['space']);
