/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { Logger as CoreLogger, PluginSetup, PluginStart } from '@kbn/core-di';
import type { ManagedWorkflowId } from '@kbn/workflows/managed';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { EngineHttpError } from '../errors/engine_http_error';
import { getErrorMessage } from '../errors/get_error_message';
import { getStatusCode } from '../errors/get_status_code';
import { DETECTION_ENGINE_WORKFLOW_OWNER } from './constants';
import { DETECTION_WORKFLOW_IDS } from './workflow_registry';

interface WorkflowScope {
  request: KibanaRequest;
  spaceId: string;
}

interface WorkflowAccountScope extends WorkflowScope {
  serviceAccountId: string;
  /** The workflows to act on. The registry's, unless a caller narrows it. */
  workflowIds?: readonly ManagedWorkflowId[];
}

/** The id of a managed workflow's document installed in a space. */
export const getWorkflowDocumentId = ({
  workflowId,
  spaceId,
}: {
  workflowId: ManagedWorkflowId;
  spaceId: string;
}): string => `${workflowId}-${spaceId}`;

/**
 * Installs the managed workflows of a space bound to its service account, and turns them on. It
 * knows nothing of what any workflow does: which ones exist is `DETECTION_WORKFLOW_IDS`.
 */
@injectable()
export class WorkflowInstaller {
  constructor(
    @inject(PluginStart<WorkflowsExtensionsServerPluginStart>('workflowsExtensions'))
    private readonly workflowsExtensions: WorkflowsExtensionsServerPluginStart,
    @inject(PluginSetup<WorkflowsServerPluginSetup>('workflowsManagement'))
    private readonly workflowsManagement: WorkflowsServerPluginSetup,
    @inject(CoreLogger) private readonly logger: Logger
  ) {}

  /**
   * Installs every workflow in a space, bound to `serviceAccountId`, and leaves it off:
   * 1. Install it with the caller's request, because binding a workflow to an account needs the
   *    caller's `manage_security`, which the workflows plugin enforces. Installing again with
   *    another account rebinds the workflow and keeps its enabled state.
   * 2. Check it runs as the account, because installing is best-effort in the workflows plugin.
   *
   * A first install stays off until `enable`, so a setup that fails or loses a race after this
   * leaves nothing running.
   *
   * @throws EngineHttpError when an install fails, or when an installed workflow does not run as
   * the account.
   */
  public async install({
    request,
    spaceId,
    serviceAccountId,
    workflowIds = DETECTION_WORKFLOW_IDS,
  }: WorkflowAccountScope): Promise<void> {
    for (const workflowId of workflowIds) {
      await this.installWorkflow({ request, spaceId, serviceAccountId, workflowId });
      await this.assertBoundTo({ request, spaceId, serviceAccountId, workflowId });
    }
  }

  /**
   * Turns every installed workflow on. Safe to call when they are already on. A workflow that was
   * off and cannot be followed by the rest is turned off again, so a space whose setup fails keeps
   * nothing running. Each binding is checked again afterwards: a concurrent `_enable` for another
   * account may have rebound a workflow since `install` checked it, and a workflow on under the wrong
   * account is refused by every tick. There is no compare-and-set on the binding, so this narrows
   * that race rather than closing it. Nothing is turned off for it, as the winner's workflow is on.
   *
   * @throws EngineHttpError when a workflow cannot be turned on, or no longer runs as the account.
   */
  public async enable({
    request,
    spaceId,
    serviceAccountId,
    workflowIds = DETECTION_WORKFLOW_IDS,
  }: WorkflowAccountScope): Promise<void> {
    const turnedOn: ManagedWorkflowId[] = [];

    try {
      for (const workflowId of workflowIds) {
        if (await this.turnOn({ request, spaceId, workflowId })) {
          turnedOn.push(workflowId);
        }
      }
    } catch (error) {
      await this.turnOff({ request, spaceId, workflowIds: turnedOn });
      throw error;
    }

    for (const workflowId of workflowIds) {
      await this.assertBoundTo({ request, spaceId, serviceAccountId, workflowId });
    }
  }

  private async installWorkflow({
    request,
    spaceId,
    serviceAccountId,
    workflowId,
  }: WorkflowAccountScope & { workflowId: ManagedWorkflowId }): Promise<void> {
    const client = await this.workflowsExtensions.getClient(request);

    try {
      await client.managedWorkflows.install(DETECTION_ENGINE_WORKFLOW_OWNER, workflowId, {
        spaceId,
        workflowIdSuffix: spaceId,
        values: { serviceAccountId },
      });
    } catch (error) {
      // Keep the status of the workflows plugin: a 403 or 400 is not fixed by calling again.
      const statusCode = getStatusCode(error) ?? 500;
      const retry = statusCode >= 500 ? ' Call _enable again to retry.' : '';
      throw new EngineHttpError(
        `Installing workflow [${workflowId}] failed: ${getErrorMessage(error)}.${retry}`,
        statusCode
      );
    }
  }

  /** Turns a workflow on and returns whether it was off before. */
  private async turnOn({
    request,
    spaceId,
    workflowId,
  }: WorkflowScope & { workflowId: ManagedWorkflowId }): Promise<boolean> {
    const documentId = getWorkflowDocumentId({ workflowId, spaceId });

    try {
      const wasEnabled =
        (await this.workflowsManagement.management.getWorkflow(documentId, spaceId, request))
          ?.enabled === true;
      await this.workflowsManagement.management.updateWorkflow(
        documentId,
        { enabled: true },
        spaceId,
        request
      );

      return !wasEnabled;
    } catch (error) {
      const statusCode = getStatusCode(error) ?? 500;
      const retry = statusCode >= 500 ? ' Call _enable again to retry.' : '';
      throw new EngineHttpError(
        `Turning on workflow [${workflowId}] failed: ${getErrorMessage(error)}.${retry}`,
        statusCode
      );
    }
  }

  /** Best effort: the error that led here is the one to report, so a failure is logged. */
  private async turnOff({
    request,
    spaceId,
    workflowIds,
  }: WorkflowScope & { workflowIds: readonly ManagedWorkflowId[] }): Promise<void> {
    for (const workflowId of workflowIds) {
      try {
        await this.workflowsManagement.management.updateWorkflow(
          getWorkflowDocumentId({ workflowId, spaceId }),
          { enabled: false },
          spaceId,
          request
        );
      } catch (error) {
        this.logger.warn(
          `Could not turn off workflow [${workflowId}] of space ${spaceId}: ${getErrorMessage(
            error
          )}`
        );
      }
    }
  }

  private async assertBoundTo({
    request,
    spaceId,
    serviceAccountId,
    workflowId,
  }: WorkflowAccountScope & { workflowId: ManagedWorkflowId }): Promise<void> {
    const document = await this.workflowsManagement.management.getWorkflow(
      getWorkflowDocumentId({ workflowId, spaceId }),
      spaceId,
      request
    );

    if (document?.definition?.settings?.run_as !== serviceAccountId) {
      throw new EngineHttpError(
        `Setting up space [${spaceId}] did not bind [${workflowId}] to [${serviceAccountId}]. Call _enable again to retry.`,
        500
      );
    }
  }
}
