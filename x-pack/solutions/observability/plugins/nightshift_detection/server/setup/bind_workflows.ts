/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnSetup, PluginSetup } from '@kbn/core-di';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { ContainerModuleLoadOptions } from 'inversify';
import { DETECTION_ENGINE_WORKFLOW_OWNER } from '../lib/workflows/constants';
import { WorkflowInstaller } from '../lib/workflows/workflow_installer';

/** Binds what installs the plugin's managed workflows in a space, and registers their owner. */
export function bindWorkflows({ bind }: ContainerModuleLoadOptions): void {
  bind(WorkflowInstaller).toSelf().inSingletonScope();

  // The workflows plugin refuses to install a managed workflow whose owner is not registered.
  bind(OnSetup).toResolvedValue(
    (workflowsExtensions) => () => {
      workflowsExtensions.registerManagedWorkflowOwner(DETECTION_ENGINE_WORKFLOW_OWNER);
    },
    [PluginSetup<WorkflowsExtensionsServerPluginSetup>('workflowsExtensions')]
  );
}
