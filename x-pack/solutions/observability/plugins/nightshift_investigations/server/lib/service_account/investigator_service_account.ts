/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { parse as parseYaml } from 'yaml';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type {
  InvestigatorServiceAccountStatus,
  NightshiftBoundWorkflowStatus,
  NightshiftServiceAccountInfo,
} from '../../../common';
import { NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER } from '../managed_workflows/constants';
import { BOUND_WORKFLOW_IDS, type BoundWorkflowId } from './bound_workflows';
import {
  getBoundInvestigationWorkflowId,
  getNightshiftRoleName,
  getNightshiftServiceAccountId,
  getNightshiftServiceAccountName,
  INVESTIGATOR_SERVICE_ACCOUNT_ID,
  NIGHTSHIFT_SERVICE_ACCOUNT_KINDS,
  type NightshiftServiceAccountKind,
} from './constants';

interface Deps {
  core: CoreStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  workflowsManagement?: WorkflowsServerPluginSetup;
  spaces?: SpacesPluginStart;
  /** Serverless accounts hold the `_`-prefixed predefined roles. */
  isServerless: boolean;
  logger: Logger;
}

const ACCOUNT_DESCRIPTION: Record<NightshiftServiceAccountKind, string> = {
  agent: 'Runs Nightshift investigations, their sandbox tools and learning hooks.',
  automations: 'Runs Nightshift automations, which start investigations.',
};

const getStatusCode = (error: unknown): number | undefined => {
  if (Boom.isBoom(error)) return error.output.statusCode;
  const { statusCode, meta } = (error ?? {}) as {
    statusCode?: number;
    meta?: { statusCode?: number };
  };
  return statusCode ?? meta?.statusCode;
};

/** `settings.run_as` of a workflow's YAML, for a workflow whose definition failed validation. */
const readRunAs = (yaml: string | undefined): string | undefined => {
  if (!yaml) return undefined;
  try {
    const runAs = parseYaml(yaml)?.settings?.run_as;
    return typeof runAs === 'string' ? runAs : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Sets Nightshift up in a space: creates the deployment's Nightshift service accounts when they
 * are missing, and installs the space's workflows bound to the agent account. Investigations do
 * not depend on it yet.
 */
export const createInvestigatorServiceAccountService = ({
  core,
  workflowsExtensions,
  workflowsManagement,
  spaces,
  isServerless,
  logger,
}: Deps) => {
  const getServiceAccounts = (): NightshiftServiceAccountInfo[] =>
    NIGHTSHIFT_SERVICE_ACCOUNT_KINDS.map((kind) => ({
      kind,
      id: getNightshiftServiceAccountId(kind),
      role: getNightshiftRoleName(kind, { isServerless }),
    }));

  /** Creates the account when missing. A name conflict means it already exists, and is reused. */
  const ensureServiceAccount = async (
    request: KibanaRequest,
    kind: NightshiftServiceAccountKind
  ): Promise<void> => {
    try {
      await core.security.serviceAccounts.create(request, {
        name: getNightshiftServiceAccountName(kind),
        description: `${ACCOUNT_DESCRIPTION[kind]} Created by Nightshift.`,
        roles: [getNightshiftRoleName(kind, { isServerless })],
      });
    } catch (error) {
      if (getStatusCode(error) !== 409) throw error;
    }
  };

  const canManageSecurity = async (request: KibanaRequest): Promise<boolean> => {
    const { has_all_requested: allowed } = await core.elasticsearch.client
      .asScoped(request)
      .asCurrentUser.security.hasPrivileges({ cluster: ['manage_security'] });
    return allowed;
  };

  // Setups of one space run one after another, so two clicks cannot interleave their installs.
  const queues = new Map<string, Promise<unknown>>();

  const getBoundWorkflowStatus = async (
    request: KibanaRequest,
    spaceId: string,
    id: BoundWorkflowId
  ): Promise<NightshiftBoundWorkflowStatus> => {
    const client = await workflowsExtensions.getClient(request);
    const status = await client.managedWorkflows.getWorkflowStatus(
      NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER,
      id,
      { spaceId, workflowIdSuffix: spaceId }
    );
    const workflowId = `${id}-${spaceId}`;
    const workflow =
      status.installed && workflowsManagement
        ? await workflowsManagement.management
            .getWorkflow(workflowId, spaceId, request)
            .catch((error: unknown) => {
              logger.debug(`Could not read [${workflowId}] in space [${spaceId}]: ${error}`);
              return null;
            })
        : null;
    const runAs = workflow?.definition?.settings?.run_as ?? readRunAs(workflow?.yaml) ?? null;
    return {
      workflowId,
      installed: status.installed,
      enabled: status.enabled,
      runAs,
      bound: runAs === INVESTIGATOR_SERVICE_ACCOUNT_ID,
      valid: workflow?.valid ?? null,
    };
  };

  const getStatus = async (
    request: KibanaRequest,
    spaceId: string
  ): Promise<InvestigatorServiceAccountStatus> => {
    const boundWorkflows = await Promise.all(
      BOUND_WORKFLOW_IDS.map((id) => getBoundWorkflowStatus(request, spaceId, id))
    );
    const entryPoint =
      boundWorkflows[BOUND_WORKFLOW_IDS.indexOf(NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID)];
    const canModifyBoundWorkflows = await canManageSecurity(request).catch(() => false);
    return {
      canModifyBoundWorkflows,
      serviceAccountsEnabled: core.security.serviceAccounts.isEnabled(),
      serviceAccountId: INVESTIGATOR_SERVICE_ACCOUNT_ID,
      role: getNightshiftRoleName('agent', { isServerless }),
      workflowId: getBoundInvestigationWorkflowId(spaceId),
      installed: entryPoint.installed,
      enabled: entryPoint.enabled,
      bound: entryPoint.bound,
      serviceAccounts: getServiceAccounts(),
      boundWorkflows,
    };
  };

  const assertSpaceExists = async (request: KibanaRequest, spaceId: string): Promise<void> => {
    if (!spaces) return;
    try {
      await spaces.spacesService.createSpacesClient(request).get(spaceId);
    } catch (error) {
      if (getStatusCode(error) === 404) {
        throw Boom.notFound(`Space [${spaceId}] does not exist.`);
      }
      throw error;
    }
  };

  const installBoundWorkflows = async (request: KibanaRequest, spaceId: string): Promise<void> => {
    // Installing again with a different account (an earlier setup's) rebinds the workflow.
    const client = await workflowsExtensions.getClient(request);
    for (const id of BOUND_WORKFLOW_IDS) {
      try {
        await client.managedWorkflows.install(
          NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER,
          id,
          {
            spaceId,
            workflowIdSuffix: spaceId,
            values: { serviceAccountId: INVESTIGATOR_SERVICE_ACCOUNT_ID },
          }
        );
      } catch (error) {
        logger.error(`Nightshift setup in space [${spaceId}] failed to install [${id}]: ${error}`);
        throw Boom.boomify(error instanceof Error ? error : new Error(String(error)), {
          statusCode: getStatusCode(error) ?? 500,
          message: `Installing workflow [${id}] failed`,
        });
      }
    }
  };

  const assertAllBound = (status: InvestigatorServiceAccountStatus, spaceId: string): void => {
    // A workflow that fails validation here (the Slack thread workflow without the Slack trigger)
    // is reported, not fatal: it starts working once its trigger is registered.
    const invalid = status.boundWorkflows.filter(({ valid }) => valid === false);
    if (invalid.length > 0) {
      logger.warn(
        `Nightshift setup in space [${spaceId}] installed invalid workflows: ${invalid
          .map(({ workflowId }) => workflowId)
          .join(', ')}`
      );
    }
    const unbound = status.boundWorkflows.filter(
      ({ installed, bound, valid }) => !installed || (!bound && valid !== false)
    );
    if (unbound.length > 0) {
      throw Boom.internal(
        `Nightshift setup in space [${spaceId}] did not bind ${unbound
          .map(({ workflowId, runAs }) => `[${workflowId}] (runs as ${runAs ?? 'the caller'})`)
          .join(', ')} to [${INVESTIGATOR_SERVICE_ACCOUNT_ID}]`
      );
    }
  };

  const runEnable = async (
    request: KibanaRequest,
    spaceId: string
  ): Promise<InvestigatorServiceAccountStatus> => {
    if (!core.security.serviceAccounts.isEnabled()) {
      throw Boom.badRequest(
        'Service accounts are disabled. Set xpack.security.serviceAccounts.enabled: true.'
      );
    }
    if (!(await canManageSecurity(request))) {
      throw Boom.forbidden(
        'Setting up the Nightshift service accounts requires the manage_security cluster privilege.'
      );
    }
    await assertSpaceExists(request, spaceId);

    for (const kind of NIGHTSHIFT_SERVICE_ACCOUNT_KINDS) {
      await ensureServiceAccount(request, kind);
    }
    await installBoundWorkflows(request, spaceId);

    const status = await getStatus(request, spaceId);
    assertAllBound(status, spaceId);
    logger.info(
      `Nightshift in space [${spaceId}] is set up with service account [${INVESTIGATOR_SERVICE_ACCOUNT_ID}]`
    );
    return status;
  };

  /**
   * Sets up a space with the caller's privileges. Binding a workflow requires the caller to hold
   * `manage_security`; the workflows plugin enforces that too. Idempotent: running it again
   * repairs a space whose workflows were removed or bound to another account.
   */
  const enable = (
    request: KibanaRequest,
    spaceId: string
  ): Promise<InvestigatorServiceAccountStatus> => {
    const previous = queues.get(spaceId) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(() => runEnable(request, spaceId));
    queues.set(spaceId, run);
    run
      .catch(() => undefined)
      .finally(() => {
        if (queues.get(spaceId) === run) queues.delete(spaceId);
      });
    return run;
  };

  /**
   * Uninstalls the space's bound workflows. The accounts are shared by every space and are kept,
   * so `_enable` restores the space with the same identities.
   */
  const disable = async (
    request: KibanaRequest,
    spaceId: string
  ): Promise<InvestigatorServiceAccountStatus> => {
    const client = await workflowsExtensions.getClient(request);
    // The entry point goes first, so the space stops reading as set up before anything else goes.
    for (const id of [...BOUND_WORKFLOW_IDS].reverse()) {
      await client.managedWorkflows.uninstall(
        NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER,
        id,
        {
          spaceId,
          workflowIdSuffix: spaceId,
        }
      );
    }
    return getStatus(request, spaceId);
  };

  return { enable, disable, getStatus, canManageSecurity };
};

export type InvestigatorServiceAccountService = ReturnType<
  typeof createInvestigatorServiceAccountService
>;
