/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { KibanaRequest } from '@kbn/core/server';
import { PluginSetup, PluginStart } from '@kbn/core-di';
import { NIGHTSHIFT_CONTINUOUS_DETECTION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { EngineHttpError } from '../errors/engine_http_error';
import { getErrorMessage } from '../errors/get_error_message';
import { getStatusCode } from '../errors/get_status_code';

/** Owner id of the managed workflows the engine installs; the workflow definition names it too. */
export const DETECTION_ENGINE_WORKFLOW_OWNER = 'nightshiftDetection';

/** Installs the continuous detection workflow in a space, checks it is bound, and turns it on. */
@injectable()
export class DetectionWorkflowInstaller {
  constructor(
    @inject(PluginStart<WorkflowsExtensionsServerPluginStart>('workflowsExtensions'))
    private readonly workflowsExtensions: WorkflowsExtensionsServerPluginStart,
    @inject(PluginSetup<WorkflowsServerPluginSetup>('workflowsManagement'))
    private readonly workflowsManagement: WorkflowsServerPluginSetup
  ) {}

  /** The id of the workflow document installed in a space. */
  private static getDocumentId(spaceId: string): string {
    return `${NIGHTSHIFT_CONTINUOUS_DETECTION_WORKFLOW_ID}-${spaceId}`;
  }

  /**
   * Installs the continuous detection workflow in a space, bound to `serviceAccountId`, and leaves it off:
   * 1. Install it with the caller's request, because binding a workflow to an account needs the
   *    caller's `manage_security`, which the workflows plugin enforces. Installing again with
   *    another account rebinds the workflow and keeps its enabled state.
   * 2. Check it runs as the account, because installing is best-effort in the workflows plugin.
   *
   * A first install stays off until `enable`, so a setup that fails or loses a race after this
   * leaves no workflow running.
   *
   * @throws EngineHttpError when the install fails, or when the installed workflow does not run as
   * the account.
   */
  public async install({
    request,
    spaceId,
    serviceAccountId,
  }: {
    request: KibanaRequest;
    spaceId: string;
    serviceAccountId: string;
  }): Promise<void> {
    await this.installWorkflow({ request, spaceId, serviceAccountId });
    await this.assertBoundTo({ request, spaceId, serviceAccountId });
  }

  /** Turns the installed workflow on. Safe to call when it is already on. */
  public async enable({
    request,
    spaceId,
  }: {
    request: KibanaRequest;
    spaceId: string;
  }): Promise<void> {
    await this.workflowsManagement.management.updateWorkflow(
      DetectionWorkflowInstaller.getDocumentId(spaceId),
      { enabled: true },
      spaceId,
      request
    );
  }

  private async installWorkflow({
    request,
    spaceId,
    serviceAccountId,
  }: {
    request: KibanaRequest;
    spaceId: string;
    serviceAccountId: string;
  }): Promise<void> {
    const client = await this.workflowsExtensions.getClient(request);

    try {
      await client.managedWorkflows.install(
        DETECTION_ENGINE_WORKFLOW_OWNER,
        NIGHTSHIFT_CONTINUOUS_DETECTION_WORKFLOW_ID,
        { spaceId, workflowIdSuffix: spaceId, values: { serviceAccountId } }
      );
    } catch (error) {
      // Keep the status of the workflows plugin: a 403 or 400 is not fixed by calling again.
      const statusCode = getStatusCode(error) ?? 500;
      const retry = statusCode >= 500 ? ' Call _enable again to retry.' : '';
      throw new EngineHttpError(
        `Installing workflow [${NIGHTSHIFT_CONTINUOUS_DETECTION_WORKFLOW_ID}] failed: ${getErrorMessage(
          error
        )}.${retry}`,
        statusCode
      );
    }
  }

  private async assertBoundTo({
    request,
    spaceId,
    serviceAccountId,
  }: {
    request: KibanaRequest;
    spaceId: string;
    serviceAccountId: string;
  }): Promise<void> {
    const document = await this.workflowsManagement.management.getWorkflow(
      DetectionWorkflowInstaller.getDocumentId(spaceId),
      spaceId,
      request
    );

    if (document?.definition?.settings?.run_as !== serviceAccountId) {
      throw new EngineHttpError(
        `Setting up space [${spaceId}] did not bind [${NIGHTSHIFT_CONTINUOUS_DETECTION_WORKFLOW_ID}] to [${serviceAccountId}]. Call _enable again to retry.`,
        500
      );
    }
  }
}
