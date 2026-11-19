/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnSetup, PluginSetup } from '@kbn/core-di';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { ContainerModuleLoadOptions } from 'inversify';
import { TickService } from '../lib/engine/tick_service';
import {
  DETECTION_ENGINE_WORKFLOW_OWNER,
  DetectionWorkflowInstaller,
} from '../lib/workflows/detection_workflow_installer';

/** Binds the continuous detection workflow installer and the service that runs a tick from a request. */
export function bindTick({ bind }: ContainerModuleLoadOptions): void {
  bind(DetectionWorkflowInstaller).toSelf().inSingletonScope();
  bind(TickService).toSelf().inSingletonScope();

  // The workflows plugin refuses to install a managed workflow whose owner is not registered.
  bind(OnSetup).toResolvedValue(
    (workflowsExtensions) => () => {
      workflowsExtensions.registerManagedWorkflowOwner(DETECTION_ENGINE_WORKFLOW_OWNER);
    },
    [PluginSetup<WorkflowsExtensionsServerPluginSetup>('workflowsExtensions')]
  );
}
