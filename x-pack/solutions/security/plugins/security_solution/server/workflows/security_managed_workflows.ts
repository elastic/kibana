/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger, SavedObjectsClientContract } from '@kbn/core/server';
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
 * analysis (always), install or uninstall threat-intel workflows when the supply
 * flag is on/off, then call `ready()` exactly once. Replaces the two prior
 * AndMarkReady helpers that each called `ready()` and raced each other.
 */
export const installSecurityManagedWorkflowsAndMarkReady = async ({
  workflowsExtensions,
  logger,
  threatIntelSupplyEnabled,
  bootstrapReady,
  core,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  logger: Logger;
  threatIntelSupplyEnabled: boolean;
  /**
   * Resolves after TI bootstrap (templates, migrations, seed). Only awaited when
   * the supply flag is on; ignored otherwise.
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
 * `attribute_alerts_to_reports` per missing space (ingest/enrich are global).
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

const createSpaceRepository = (
  core: Pick<CoreStart, 'savedObjects'>
): Pick<SavedObjectsClientContract, 'find'> =>
  core.savedObjects.createInternalRepository(['space']);
