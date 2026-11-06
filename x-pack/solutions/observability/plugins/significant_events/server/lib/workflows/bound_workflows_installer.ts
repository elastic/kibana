/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type {
  ManagedWorkflowOperationOptions,
  ManagedWorkflowServiceInstallOptions,
} from '@kbn/workflows/server/types';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import {
  createNotSetUpError,
  getDetectionEngineAccountId,
} from '../service_accounts/detection_engine_account';
import { SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER } from './managed_workflow_owner';

/**
 * The managed workflows API types `values` by workflow id, which a runtime id cannot satisfy. The
 * ids this installer takes are the bound ones, whose values all carry `serviceAccountId`.
 */
interface IUntypedManagedWorkflows {
  install: (
    pluginId: string,
    id: string,
    options: ManagedWorkflowServiceInstallOptions
  ) => Promise<void>;
}

interface IUntypedOwnerWorkflows {
  disable: (id: string, options: ManagedWorkflowOperationOptions) => Promise<boolean>;
}

interface IBoundWorkflowParams {
  /** The caller. Binding a workflow to an account needs the caller's `manage_security`. */
  request: KibanaRequest;
  spaceId: string;
  /** The managed workflow type id; the installed document is `<id>-<spaceId>`. */
  workflowId: string;
}

interface IOwnerWorkflowParams {
  spaceId: string;
  /** The managed workflow type id; the document is `<id>-<spaceId>`. */
  workflowId: string;
}

/** Installs and switches off the workflows bound to the detection engine account of a space. */
export interface BoundWorkflowsInstaller {
  /**
   * Installs the space's copy of a bound workflow, rendered with the space's account. Installing
   * again updates it and keeps its enabled state. `serviceAccountId` skips the lookup when the
   * caller has just bound the space.
   */
  install: (
    params: IBoundWorkflowParams & {
      serviceAccountId?: string;
      values?: Record<string, string | number>;
    }
  ) => Promise<void>;
  /**
   * Switches the space's copy of a bound workflow off through the owner, with no `manage_security`.
   * Resolves `false` when nothing was switched off, such as a missing or already disabled copy.
   */
  disable: (params: IOwnerWorkflowParams) => Promise<boolean>;
}

/** Creates the installer over the Workflows extensions start contract. */
export function createBoundWorkflowsInstaller({
  getStartDeps,
}: {
  /** Resolved on use, so the installer can be created before Core has started. */
  getStartDeps: () => Promise<{
    core: CoreStart;
    workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined;
  }>;
}): BoundWorkflowsInstaller {
  const getClient = async (request: KibanaRequest) => {
    const { workflowsExtensions } = await getStartDeps();
    if (!workflowsExtensions) {
      throw new Error('Workflows are not available');
    }
    return (await workflowsExtensions.getClient(request))
      .managedWorkflows as unknown as IUntypedManagedWorkflows;
  };

  // The request-less lifecycle API of the owner: no caller, so nothing to check `manage_security` on.
  const getOwnerClient = async () => {
    const { workflowsExtensions } = await getStartDeps();
    if (!workflowsExtensions) {
      throw new Error('Workflows are not available');
    }
    return (await workflowsExtensions.initManagedWorkflowsClient(
      SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER
    )) as unknown as IUntypedOwnerWorkflows;
  };

  return {
    async install({ request, spaceId, workflowId, serviceAccountId, values }) {
      const { core } = await getStartDeps();
      const accountId = serviceAccountId ?? (await getDetectionEngineAccountId({ core, spaceId }));
      if (accountId === undefined) {
        throw createNotSetUpError({
          serviceAccountsEnabled: core.security.serviceAccounts.isEnabled(),
        });
      }
      const client = await getClient(request);
      await client.install(SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER, workflowId, {
        spaceId,
        workflowIdSuffix: spaceId,
        values: { serviceAccountId: accountId, ...values },
      });
    },

    async disable({ spaceId, workflowId }) {
      const client = await getOwnerClient();
      return client.disable(workflowId, { spaceId, workflowIdSuffix: spaceId });
    },
  };
}
