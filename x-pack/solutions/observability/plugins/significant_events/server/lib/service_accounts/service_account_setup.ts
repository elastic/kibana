/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { getNightshiftRoleName, getNightshiftServiceAccountName } from '@kbn/nightshift-shared';
import {
  NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_INVESTIGATION_COMPLETED_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_ORCHESTRATOR_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SOURCE_RECONCILIATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  stateBlocksNewActivity,
  type SignificantEventsMaintenanceState,
} from '../../../common/maintenance/state_machine';
import type { DetectionEngineServiceAccountStatus } from '../../../common';
import { StatusError } from '../errors/status_error';
import { SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER } from '../workflows/managed_workflow_owner';
import {
  DETECTION_ENGINE_WORKLOAD_ID,
  DETECTION_ENGINE_WORKLOAD_TYPE,
  canManageSecurity,
  getDetectionEngineAccountId,
} from './detection_engine_account';
import { SETUP_ENABLED_WORKFLOW_IDS } from '../maintenance/managed_workflow_targets';

/**
 * The bound workflows every set-up space gets, installed per space with the space id as suffix.
 * Continuous onboarding and the scheduled discovery pair are installed when their settings are
 * turned on, because their templates carry the setting's values.
 */
export const SETUP_WORKFLOW_IDS = [
  NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_ORCHESTRATOR_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SOURCE_RECONCILIATION_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_INVESTIGATION_COMPLETED_WORKFLOW_ID,
] as const;

// Boom errors, which the workflows plugin throws, keep their status in `output.statusCode`.
const getStatusCode = (error: unknown): number | undefined =>
  isBoom(error)
    ? error.output.statusCode
    : typeof error === 'object' && error !== null && 'statusCode' in error
    ? (error as { statusCode?: number }).statusCode
    : undefined;

/** Sets a space up to run the detection engine as the deployment's `nightshift_detection` account. */
export interface DetectionEngineSetupService {
  /**
   * Binds the account to the space's detection engine. Binding needs an authenticated user with
   * `manage_security`, so setup is an explicit admin action and cannot happen at startup. Idempotent:
   * binding again with another account rebinds the space.
   */
  enable: (params: {
    request: KibanaRequest;
    spaceId: string;
    serviceAccountId: string;
  }) => Promise<{ spaceId: string; serviceAccountId: string }>;
  /** What the current user can see about the space's setup. */
  getStatus: (params: {
    request: KibanaRequest;
    spaceId: string;
  }) => Promise<DetectionEngineServiceAccountStatus>;
}

/** Creates the setup service for one deployment. `isServerless` picks the name of the account's role. */
export function createDetectionEngineSetupService({
  core,
  spaces,
  workflowsExtensions,
  workflowsManagement,
  getMaintenanceState,
  isServerless,
  logger,
}: {
  core: CoreStart;
  spaces: SpacesPluginStart | undefined;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined;
  workflowsManagement: WorkflowsServerPluginSetup | undefined;
  /** The space's maintenance state, which decides whether the scheduled workflows start. */
  getMaintenanceState?: (request: KibanaRequest) => Promise<SignificantEventsMaintenanceState>;
  isServerless: boolean;
  logger?: Logger;
}): DetectionEngineSetupService {
  const role = getNightshiftRoleName('detection', { isServerless });

  const assertSpaceExists = async ({
    request,
    spaceId,
  }: {
    request: KibanaRequest;
    spaceId: string;
  }): Promise<void> => {
    if (!spaces) {
      return;
    }
    try {
      await spaces.spacesService.createSpacesClient(request).get(spaceId);
    } catch (error) {
      if (isBoom(error) && error.output.statusCode === 404) {
        throw new StatusError(`Space [${spaceId}] does not exist.`, 404);
      }
      throw error;
    }
  };

  // An account holding a role that does not exist has no privileges, and every run would then be
  // refused. Kibana never creates the role. Looked up with the query API: `getRole` answers 404
  // for the predefined roles of Serverless.
  const assertRoleExists = async (request: KibanaRequest): Promise<void> => {
    const { total } = await core.elasticsearch.client
      .asScoped(request)
      .asCurrentUser.security.queryRole({ query: { term: { name: role } }, size: 1 });
    if (total === 0) {
      throw new StatusError(
        `The role [${role}] of the detection engine service account does not exist. ` +
          'Create it (see the Significant Events README, "Setting up a space"), then call _enable again.',
        400
      );
    }
  };

  // Puts the space back on the account it had before `_enable`, so a failed call never leaves it
  // reading as set up. A failure here is logged rather than thrown, so the caller still learns why
  // `_enable` failed instead of a rollback error.
  const restorePreviousBinding = async ({
    request,
    spaceId,
    serviceAccountId,
    previousAccountId,
  }: {
    request: KibanaRequest;
    spaceId: string;
    serviceAccountId: string;
    previousAccountId: string | undefined;
  }): Promise<void> => {
    try {
      // A concurrent `_enable` may have bound the space since: its binding is not this call's to
      // undo. Bindings have no compare-and-set, so this narrows the race rather than closing it.
      const currentAccountId = await getDetectionEngineAccountId({ core, spaceId });
      if (currentAccountId !== serviceAccountId) {
        return;
      }
      if (previousAccountId) {
        await core.security.serviceAccounts.bindWorkload(request, {
          serviceAccountId: previousAccountId,
          workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
          workloadId: DETECTION_ENGINE_WORKLOAD_ID,
        });
      } else {
        await core.security.serviceAccounts.unbindWorkload(request, {
          workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
          workloadId: DETECTION_ENGINE_WORKLOAD_ID,
        });
      }
    } catch (error) {
      logger?.error(
        `Could not restore the detection engine binding of the space${
          previousAccountId ? ` to [${previousAccountId}]` : ''
        }; it may still be bound to the refused account. Call _enable again with the right account: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // Core cannot look an account up before binding it, so the binding is read back: its summary
  // is empty when the account does not exist. The account must be the one `nightshift_detection`
  // that holds the detection role, which is what the setup step finds or creates by name. Binding
  // any other account would leave every later run failing with an opaque token exchange error, so
  // the call is refused and `enable` puts the space back as it was.
  const assertBoundAccountIsDetectionAccount = async ({
    spaceId,
    serviceAccountId,
  }: {
    spaceId: string;
    serviceAccountId: string;
  }): Promise<void> => {
    const expectedName = getNightshiftServiceAccountName('detection');
    let summary: Awaited<
      ReturnType<typeof core.security.serviceAccounts.getWorkloadServiceAccountSummary>
    >;
    try {
      summary = await core.security.serviceAccounts.getWorkloadServiceAccountSummary({
        workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
        workloadId: DETECTION_ENGINE_WORKLOAD_ID,
        spaceId,
      });
    } catch (error) {
      // UIAM answers 403 when Kibana's own identity may not read the account, as in the local
      // UIAM of the functional tests. The account cannot be checked then, and refusing would make
      // the space impossible to set up. A missing, renamed or disabled account is still refused.
      // Any other failure leaves the account unchecked, so the call fails and the binding goes.
      if (getStatusCode(error) !== 403) {
        throw error;
      }
      logger?.warn(
        `Could not verify that service account [${serviceAccountId}] is the [${expectedName}] account: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return;
    }
    if (summary?.name === expectedName && summary.enabled) {
      return;
    }
    throw new StatusError(
      summary === null
        ? `Service account [${serviceAccountId}] does not exist. Use the id of the [${expectedName}] account.`
        : `Service account [${serviceAccountId}] is [${summary.name}]${
            summary.enabled ? '' : ' and disabled'
          }, not an enabled [${expectedName}] account. Use the id of the [${expectedName}] account.`,
      400
    );
  };

  // The scheduled workflows install off. A paused space keeps them off for Resume to turn on.
  const enableScheduledWorkflows = async ({
    request,
    spaceId,
    workflowsManagement: workflows,
  }: {
    request: KibanaRequest;
    spaceId: string;
    workflowsManagement: WorkflowsServerPluginSetup;
  }) => {
    const state = (await getMaintenanceState?.(request)) ?? 'enabled';
    if (stateBlocksNewActivity(state)) {
      return;
    }
    await Promise.all(
      SETUP_ENABLED_WORKFLOW_IDS.map(async (workflowId) => {
        const documentId = `${workflowId}-${spaceId}`;
        const existing = await workflows.management
          .getClient(request)
          .getWorkflow(documentId, spaceId);
        if (existing && existing.enabled !== true) {
          await workflows.management.updateWorkflow(
            documentId,
            { enabled: true },
            spaceId,
            request
          );
        }
      })
    );
  };

  const enable: DetectionEngineSetupService['enable'] = async ({
    request,
    spaceId,
    serviceAccountId,
  }) => {
    if (!core.security.serviceAccounts.isEnabled()) {
      throw new StatusError(
        'Service accounts are disabled. Set xpack.security.serviceAccounts.enabled: true.',
        400
      );
    }
    if (!(await canManageSecurity({ core, request }))) {
      throw new StatusError(
        'Setting up the detection engine service account requires the manage_security cluster privilege.',
        403
      );
    }
    if (!workflowsExtensions || !workflowsManagement) {
      throw new StatusError('Workflows are not available', 400);
    }
    await assertSpaceExists({ request, spaceId });
    await assertRoleExists(request);
    // Bound first, so what the engine does outside workflow runs is tied to the account before
    // any workflow is. Binding again with another account rebinds the space.
    const previousAccountId = await getDetectionEngineAccountId({ core, spaceId });
    await core.security.serviceAccounts.bindWorkload(request, {
      serviceAccountId,
      workloadType: DETECTION_ENGINE_WORKLOAD_TYPE,
      workloadId: DETECTION_ENGINE_WORKLOAD_ID,
    });
    // Everything after the bind either completes the setup or puts the space back, so the
    // binding alone means the space is set up: the UI reads it to decide whether to offer setup.
    try {
      await assertBoundAccountIsDetectionAccount({ spaceId, serviceAccountId });
      // Installed with the caller's request: binding a workflow to an account needs the caller's
      // `manage_security`, which the workflows plugin enforces. Installing again with another
      // account rebinds an installed workflow and keeps its enabled state.
      const client = await workflowsExtensions.getClient(request);
      for (const workflowId of SETUP_WORKFLOW_IDS) {
        try {
          await client.managedWorkflows.install(
            SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER,
            workflowId,
            { spaceId, workflowIdSuffix: spaceId, values: { serviceAccountId } }
          );
        } catch (error) {
          // Keep the status of the workflows plugin: a 403 or 400 is not fixed by calling again.
          const statusCode = getStatusCode(error) ?? 500;
          const retry = statusCode >= 500 ? ' Call _enable again to retry.' : '';
          throw new StatusError(
            `Installing workflow [${workflowId}] failed: ${
              error instanceof Error ? error.message : String(error)
            }.${retry}`,
            statusCode
          );
        }
      }
      // Installing is best-effort in the workflows plugin, so check that every workflow ended up
      // bound to the account instead of answering with ids that were never installed.
      const unbound: string[] = [];
      for (const workflowId of SETUP_WORKFLOW_IDS) {
        const document = await workflowsManagement.management.getWorkflow(
          `${workflowId}-${spaceId}`,
          spaceId,
          request
        );
        if (document?.definition?.settings?.run_as !== serviceAccountId) {
          unbound.push(workflowId);
        }
      }
      // A concurrent call for another account may have rebound the space after this one bound it.
      const currentAccountId = await getDetectionEngineAccountId({ core, spaceId });
      if (currentAccountId !== serviceAccountId) {
        throw new StatusError(
          `The detection engine of space [${spaceId}] is now bound to [${currentAccountId}] instead of [${serviceAccountId}], so a concurrent _enable replaced this one. Call _enable again with the account you want.`,
          409
        );
      }
      if (unbound.length > 0) {
        throw new StatusError(
          `Setting up space [${spaceId}] did not bind ${unbound
            .map((id) => `[${id}]`)
            .join(', ')} to [${serviceAccountId}]. Call _enable again to retry.`,
          500
        );
      }
      await enableScheduledWorkflows({ request, spaceId, workflowsManagement });
    } catch (error) {
      await restorePreviousBinding({ request, spaceId, serviceAccountId, previousAccountId });
      throw error;
    }
    return { spaceId, serviceAccountId };
  };

  return {
    enable,

    async getStatus({ request, spaceId }) {
      const serviceAccountsEnabled = core.security.serviceAccounts.isEnabled();
      const [serviceAccountId, canSetUp] = await Promise.all([
        getDetectionEngineAccountId({ core, spaceId }),
        // A failing privilege probe must not fail a read: it reads as "cannot set up".
        serviceAccountsEnabled ? canManageSecurity({ core, request }).catch(() => false) : false,
      ]);
      return {
        serviceAccountsEnabled,
        canSetUp,
        role,
        serviceAccountId: serviceAccountId ?? null,
      };
    },
  };
}
