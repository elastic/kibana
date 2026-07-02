/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import { APP_ID } from '../../common/constants';

export type SecurityManagedWorkflowsClient = Awaited<
  ReturnType<WorkflowsExtensionsServerPluginStart['initManagedWorkflowsClient']>
>;

export const registerSecurityManagedWorkflowOwner = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void => {
  workflowsExtensions.registerManagedWorkflowOwner(APP_ID);
};

export const initSecurityManagedWorkflowsClient = async (
  workflowsExtensions: WorkflowsExtensionsServerPluginStart
): Promise<SecurityManagedWorkflowsClient> => {
  return workflowsExtensions.initManagedWorkflowsClient(APP_ID);
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
