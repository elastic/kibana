/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
  type ManagedWorkflowTemplateValuesForId,
} from '@kbn/workflows/managed';
import type { CoreStart, IUiSettingsClient, Logger } from '@kbn/core/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import {
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_CONFIDENCE_SCORE_MAX_THRESHOLD,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_CONFIDENCE_SCORE_MIN_THRESHOLD,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_ENABLED,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_CONNECTOR_ID,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_CREATE_CONVERSATION,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_ENABLED,
} from '@kbn/management-settings-ids';
import {
  MANAGED_ALERT_ANALYSIS_WORKFLOW_FEATURE_FLAG,
  MANAGED_ALERT_ANALYSIS_WORKFLOW_FEATURE_FLAG_DEFAULT,
} from '@kbn/workflows/common/alert_analysis_workflow';
import { APP_ID } from '../../common/constants';

export type SecurityAlertAnalysisWorkflowSettings = ManagedWorkflowTemplateValuesForId<
  typeof SECURITY_ALERT_ANALYSIS_WORKFLOW_ID
>;
type SecurityManagedWorkflowsClient = Awaited<
  ReturnType<WorkflowsExtensionsServerPluginStart['initManagedWorkflowsClient']>
>;

const SPACE_SAVED_OBJECT_TYPE = 'space';
const DEFAULT_SPACE_ID = 'default';

/**
 * Whether the managed alert analysis workflow feature is turned on, per the
 * `securitySolution.managedAlertAnalysisWorkflowEnabled` feature flag.
 */
export const isAlertAnalysisWorkflowEnabled = (
  coreStart: Pick<CoreStart, 'featureFlags'>
): Promise<boolean> =>
  coreStart.featureFlags.getBooleanValue(
    MANAGED_ALERT_ANALYSIS_WORKFLOW_FEATURE_FLAG,
    MANAGED_ALERT_ANALYSIS_WORKFLOW_FEATURE_FLAG_DEFAULT
  );

/**
 * Reads the six `alertAnalysisWorkflow*` uiSettings from an already space-scoped
 * `IUiSettingsClient` and shapes them into the workflow's template values.
 */
export const readSecurityAlertAnalysisWorkflowSettings = async (
  uiSettingsClient: Pick<IUiSettingsClient, 'get'>
): Promise<SecurityAlertAnalysisWorkflowSettings> => ({
  workflowEnabled: await uiSettingsClient.get<boolean>(
    SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_ENABLED
  ),
  autoCloseEnabled: await uiSettingsClient.get<boolean>(
    SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_ENABLED
  ),
  autoCloseConfidenceScoreMinThreshold: await uiSettingsClient.get<number>(
    SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_CONFIDENCE_SCORE_MIN_THRESHOLD
  ),
  autoCloseConfidenceScoreMaxThreshold: await uiSettingsClient.get<number>(
    SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_CONFIDENCE_SCORE_MAX_THRESHOLD
  ),
  connectorId: await uiSettingsClient.get<string>(
    SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_CONNECTOR_ID
  ),
  createConversation: await uiSettingsClient.get<boolean>(
    SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_CREATE_CONVERSATION
  ),
});

/**
 * Reads the alert analysis workflow settings for a given space without a Kibana request,
 * using an internal (system user) Saved Objects client scoped to that space's namespace.
 * Used at plugin start and when self-healing a space that is missing the workflow.
 */
export const readSecurityAlertAnalysisWorkflowSettingsForSpace = async ({
  coreStart,
  spaceId,
}: {
  coreStart: Pick<CoreStart, 'savedObjects' | 'uiSettings'>;
  spaceId: string;
}): Promise<SecurityAlertAnalysisWorkflowSettings> => {
  const spaceScopedClient = coreStart.savedObjects
    .getUnsafeInternalClient()
    .asScopedToNamespace(spaceId);
  const uiSettingsClient = coreStart.uiSettings.asScopedToClient(spaceScopedClient);
  return readSecurityAlertAnalysisWorkflowSettings(uiSettingsClient);
};

/**
 * Enumerates every space id, paging through the (hidden) `space` saved objects.
 * Always includes the default space, which has no `space` saved object of its own.
 */
export const getAllSpaceIds = async (
  coreStart: Pick<CoreStart, 'savedObjects'>
): Promise<string[]> => {
  const spaceRepo = coreStart.savedObjects.createInternalRepository([SPACE_SAVED_OBJECT_TYPE]);
  const perPage = 100;
  const spaceIds = new Set<string>([DEFAULT_SPACE_ID]);

  for (let page = 1; ; page++) {
    const { saved_objects: batch } = await spaceRepo.find<unknown>({
      type: SPACE_SAVED_OBJECT_TYPE,
      perPage,
      page,
    });

    batch.forEach((space) => spaceIds.add(space.id));

    if (batch.length < perPage) {
      break;
    }
  }

  return [...spaceIds];
};

export const registerSecurityManagedWorkflowOwner = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void => {
  workflowsExtensions.registerManagedWorkflowOwner(APP_ID);
};

export const getSecurityAlertAnalysisWorkflowIdForSpace = (spaceId: string): string => {
  return `${SECURITY_ALERT_ANALYSIS_WORKFLOW_ID}-${spaceId}`;
};

export const installSecurityAlertAnalysisWorkflow = async ({
  managedWorkflowsClient,
  spaceId,
  settings,
}: {
  managedWorkflowsClient: SecurityManagedWorkflowsClient;
  spaceId: string;
  settings: SecurityAlertAnalysisWorkflowSettings;
}): Promise<void> => {
  await managedWorkflowsClient.install(SECURITY_ALERT_ANALYSIS_WORKFLOW_ID, {
    spaceId,
    workflowIdSuffix: spaceId,
    values: settings,
  });
};

export const initSecurityManagedWorkflowsClient = async (
  workflowsExtensions: WorkflowsExtensionsServerPluginStart
): Promise<SecurityManagedWorkflowsClient> => {
  return workflowsExtensions.initManagedWorkflowsClient(APP_ID);
};

/**
 * Installs the workflow for the given space only if it is not already present, so an already
 * installed (and possibly user-disabled) workflow is left untouched. Used to self-heal spaces
 * that don't have the workflow yet (e.g. newly created spaces) without disturbing existing ones.
 */
export const ensureSecurityAlertAnalysisWorkflowInstalled = async ({
  managedWorkflowsClient,
  spaceId,
  settings,
}: {
  managedWorkflowsClient: SecurityManagedWorkflowsClient;
  spaceId: string;
  settings: SecurityAlertAnalysisWorkflowSettings;
}): Promise<void> => {
  const status = await managedWorkflowsClient.getWorkflowStatus(
    SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
    { spaceId, workflowIdSuffix: spaceId }
  );

  if (status.status !== 'missing') {
    return;
  }

  await installSecurityAlertAnalysisWorkflow({ managedWorkflowsClient, spaceId, settings });
};

/**
 * Ensures the alert analysis workflow is installed (enabled by default) in every existing space.
 * Intended to be called once at plugin start, after the managed workflow owner is registered.
 */
export const installSecurityAlertAnalysisWorkflowForAllSpaces = async ({
  coreStart,
  workflowsExtensions,
  logger,
}: {
  coreStart: Pick<CoreStart, 'savedObjects' | 'uiSettings'>;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  logger: Logger;
}): Promise<void> => {
  const managedWorkflowsClient = await initSecurityManagedWorkflowsClient(workflowsExtensions);
  const spaceIds = await getAllSpaceIds(coreStart);

  await Promise.all(
    spaceIds.map(async (spaceId) => {
      try {
        const settings = await readSecurityAlertAnalysisWorkflowSettingsForSpace({
          coreStart,
          spaceId,
        });
        await ensureSecurityAlertAnalysisWorkflowInstalled({
          managedWorkflowsClient,
          spaceId,
          settings,
        });
      } catch (error) {
        logger.warn(`Failed to install the alert analysis workflow for space "${spaceId}"`, {
          error,
        });
      }
    })
  );
};

export const markSecurityManagedWorkflowsReady = async ({
  workflowsExtensions,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  logger: Logger;
}): Promise<void> => {
  try {
    const managedWorkflowsClient = await initSecurityManagedWorkflowsClient(workflowsExtensions);
    await managedWorkflowsClient.ready();
  } catch (error) {
    logger.warn('Failed to mark Security managed workflows ready', { error });
  }
};
