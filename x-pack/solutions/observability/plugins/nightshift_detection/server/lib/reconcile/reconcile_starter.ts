/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { KibanaRequest } from '@kbn/core/server';
import { PluginSetup, PluginStart } from '@kbn/core-di';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  NIGHTSHIFT_DETECTION_RECONCILE_WORKFLOW_ID,
  NIGHTSHIFT_DETECTION_SOURCE_CHANGED,
} from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { getWorkflowDocumentId } from '../workflows/workflow_installer';

/**
 * Starts the reconcile workflow of the space behind a request when one of its sources changes, so
 * enabling or disabling a source turns its rules on or off without waiting for the six-hour sweep.
 * Deleting a source or changing its query also deletes its knowledge indicators, which starts the
 * workflow through their trigger as well; the workflow's concurrency collapses the two into one run.
 */
@injectable()
export class ReconcileStarter {
  constructor(
    @inject(PluginSetup<WorkflowsServerPluginSetup>('workflowsManagement'))
    private readonly workflowsManagement: WorkflowsServerPluginSetup,
    @inject(PluginStart<SpacesPluginStart>('spaces'))
    private readonly spaces: SpacesPluginStart
  ) {}

  /**
   * Starts the run with the request that changed the source, which must be allowed to run the
   * workflow; the workflow itself runs as the space's detection service account.
   * @returns whether a run was started: not in a space whose engine is not set up and turned on.
   */
  public async start(request: KibanaRequest): Promise<boolean> {
    const { management } = this.workflowsManagement;
    const spaceId = this.spaces.spacesService.getSpaceId(request);
    const workflow = await management.getWorkflow(
      getWorkflowDocumentId({ workflowId: NIGHTSHIFT_DETECTION_RECONCILE_WORKFLOW_ID, spaceId }),
      spaceId,
      request
    );

    if (!workflow?.definition || !workflow.enabled) {
      return false;
    }

    await management.runWorkflow(
      { ...workflow, definition: workflow.definition },
      spaceId,
      {},
      request,
      NIGHTSHIFT_DETECTION_SOURCE_CHANGED
    );
    return true;
  }
}
