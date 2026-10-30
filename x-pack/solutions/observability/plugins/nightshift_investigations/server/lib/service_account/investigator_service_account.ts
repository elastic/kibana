/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { parse as parseYaml } from 'yaml';
import type {
  CoreStart,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import {
  getNightshiftRoleName,
  getNightshiftServiceAccountName,
  NIGHTSHIFT_SERVICE_ACCOUNT_KINDS,
  type InvestigatorServiceAccountStatus,
  type NightshiftBoundWorkflowStatus,
  type NightshiftServiceAccountIds,
  type NightshiftServiceAccountInfo,
  type NightshiftUnboundAutomation,
} from '../../../common';
import { NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER } from '../managed_workflows/constants';
import { BOUND_WORKFLOW_IDS, type BoundWorkflowId } from './bound_workflows';
import {
  AUTOMATIONS_SERVICE_ACCOUNT_ID_VALUE,
  getBoundInvestigationWorkflowId,
  isEntryPointReady,
} from './constants';
import { NIGHTSHIFT_AUTOMATION_SO_TYPE } from '../../saved_objects/automation_saved_object';
import { generateWorkflowYaml } from '../automations/generate_workflow_yaml';
import type { NightshiftAutomationAttributes } from '../automations/types';

type PluginScopedManagedWorkflows = Awaited<
  ReturnType<WorkflowsExtensionsServerPluginStart['initManagedWorkflowsClient']>
>;

interface Deps {
  core: CoreStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  workflowsManagement?: WorkflowsServerPluginSetup;
  /** Reads the template values a bound workflow was installed with. */
  getInstalledWorkflowState?: PluginScopedManagedWorkflows['getInstalledWorkflowState'];
  spaces?: SpacesPluginStart;
  /** Automations are hidden saved objects; this client can read and write them. */
  getAutomationsSoClient?: (request: KibanaRequest, spaceId: string) => SavedObjectsClientContract;
  /** Serverless accounts hold the `_`-prefixed predefined roles. */
  isServerless: boolean;
  logger: Logger;
}

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
 * Sets Nightshift up in a space: installs the space's workflows bound to the deployment's
 * Nightshift service accounts. The caller finds or creates the accounts first
 * (`ensureNightshiftServiceAccounts`) and passes their ids, which only the service accounts backend
 * assigns. Investigations do not depend on it yet.
 */
export const createInvestigatorServiceAccountService = ({
  core,
  workflowsExtensions,
  workflowsManagement,
  getInstalledWorkflowState,
  spaces,
  getAutomationsSoClient,
  isServerless,
  logger,
}: Deps) => {
  const getServiceAccounts = (
    ids: Partial<NightshiftServiceAccountIds>
  ): NightshiftServiceAccountInfo[] =>
    NIGHTSHIFT_SERVICE_ACCOUNT_KINDS.map((kind) => ({
      kind,
      name: getNightshiftServiceAccountName(kind),
      id: ids[kind] ?? null,
      role: getNightshiftRoleName(kind, { isServerless }),
    }));

  /** The automations account the space was set up with, from its entry point's template values. */
  const readAutomationsServiceAccountId = async (spaceId: string): Promise<string | undefined> => {
    if (!getInstalledWorkflowState) return undefined;
    try {
      const state = await getInstalledWorkflowState(
        getBoundInvestigationWorkflowId(spaceId),
        spaceId
      );
      const id = state?.templateValues?.[AUTOMATIONS_SERVICE_ACCOUNT_ID_VALUE];
      return typeof id === 'string' && id.length > 0 ? id : undefined;
    } catch (error) {
      logger.debug(`Could not read the Nightshift setup of space [${spaceId}]: ${error}`);
      return undefined;
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
  ): Promise<Omit<NightshiftBoundWorkflowStatus, 'bound'>> => {
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
      valid: workflow?.valid ?? null,
    };
  };

  const getStatus = async (
    request: KibanaRequest,
    spaceId: string
  ): Promise<InvestigatorServiceAccountStatus> => {
    const workflows = await Promise.all(
      BOUND_WORKFLOW_IDS.map((id) => getBoundWorkflowStatus(request, spaceId, id))
    );
    const entryPoint =
      workflows[BOUND_WORKFLOW_IDS.indexOf(NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID)];
    // The space runs as the account its entry point is bound to; every other bound workflow has
    // to run as that account too.
    const agentServiceAccountId = entryPoint.installed ? entryPoint.runAs : null;
    const boundWorkflows = workflows.map((workflow) => ({
      ...workflow,
      bound: agentServiceAccountId !== null && workflow.runAs === agentServiceAccountId,
    }));
    const [canModifyBoundWorkflows, automationsServiceAccountId] = await Promise.all([
      canManageSecurity(request).catch(() => false),
      agentServiceAccountId ? readAutomationsServiceAccountId(spaceId) : undefined,
    ]);
    return {
      canModifyBoundWorkflows,
      serviceAccountsEnabled: core.security.serviceAccounts.isEnabled(),
      serviceAccountId: agentServiceAccountId,
      role: getNightshiftRoleName('agent', { isServerless }),
      workflowId: getBoundInvestigationWorkflowId(spaceId),
      installed: entryPoint.installed,
      enabled: entryPoint.enabled,
      bound: agentServiceAccountId !== null,
      serviceAccounts: getServiceAccounts({
        ...(agentServiceAccountId ? { agent: agentServiceAccountId } : {}),
        ...(automationsServiceAccountId ? { automations: automationsServiceAccountId } : {}),
      }),
      boundWorkflows,
    };
  };

  /** Changing or deleting an automation whose workflow is bound to an account needs this. */
  const assertCanModifyBoundAutomations = async (request: KibanaRequest): Promise<void> => {
    if (!(await canManageSecurity(request))) {
      throw Boom.forbidden(
        'Automations run as the Nightshift automations service account, so changing them requires the manage_security cluster privilege.'
      );
    }
  };

  /**
   * The account an automation's workflow runs as: the automations account the space was set up
   * with, kept on its entry point. Automations then keep running whoever created them. Writing a workflow bound to a service account requires
   * `manage_security` (the workflows plugin enforces it on every create, update and delete), so
   * this refuses callers without it. Returns undefined when service accounts are off: the workflow
   * then runs as its author, as before.
   */
  const resolveAutomationRunAs = async (
    request: KibanaRequest,
    spaceId: string
  ): Promise<string | undefined> => {
    if (!core.security.serviceAccounts.isEnabled()) return undefined;
    const entryPoint = await workflowsManagement?.management
      .getWorkflow(getBoundInvestigationWorkflowId(spaceId), spaceId, request)
      .catch(() => null);
    const automationsServiceAccountId = isEntryPointReady(entryPoint)
      ? await readAutomationsServiceAccountId(spaceId)
      : undefined;
    if (!automationsServiceAccountId) {
      throw Boom.badRequest(
        'Nightshift is not set up in this space. An admin must enable its service accounts before automations can run.'
      );
    }
    await assertCanModifyBoundAutomations(request);
    return automationsServiceAccountId;
  };

  /**
   * Binds every automation's workflow in the space to the automations account, as the admin
   * setting the space up, so automations created before setup stop running as their authors. A
   * failure is not fatal: it is logged and returned, so setup can report the automations that
   * still run as their author instead of leaving them unbound silently.
   */
  const bindAutomations = async (
    request: KibanaRequest,
    spaceId: string,
    automationsServiceAccountId: string
  ): Promise<NightshiftUnboundAutomation[]> => {
    const unbound: NightshiftUnboundAutomation[] = [];
    if (!getAutomationsSoClient || !workflowsManagement) return unbound;
    const soClient = getAutomationsSoClient(request, spaceId);
    const finder = soClient.createPointInTimeFinder<NightshiftAutomationAttributes>({
      type: NIGHTSHIFT_AUTOMATION_SO_TYPE,
      perPage: 100,
    });
    try {
      for await (const { saved_objects: automations } of finder.find()) {
        for (const { id, attributes } of automations) {
          if (!attributes.workflowId) continue;
          try {
            const workflow = await workflowsManagement.management.getWorkflow(
              attributes.workflowId,
              spaceId,
              request
            );
            if (workflow?.definition?.settings?.run_as === automationsServiceAccountId) continue;
            await workflowsManagement.management.updateWorkflow(
              attributes.workflowId,
              {
                yaml: generateWorkflowYaml({
                  automationId: id,
                  automation: attributes,
                  serviceAccountId: automationsServiceAccountId,
                }),
              },
              spaceId,
              request
            );
          } catch (error) {
            logger.warn(
              `Nightshift setup in space [${spaceId}] could not bind automation [${id}] to [${automationsServiceAccountId}]: ${error}`
            );
            unbound.push({
              id,
              ...(attributes.name ? { name: attributes.name } : {}),
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    } finally {
      await finder.close();
    }
    return unbound;
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

  const installBoundWorkflows = async (
    request: KibanaRequest,
    spaceId: string,
    serviceAccountIds: NightshiftServiceAccountIds
  ): Promise<void> => {
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
            values: {
              serviceAccountId: serviceAccountIds.agent,
              // Only the entry point keeps the automations account, for automations to run as.
              ...(id === NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID
                ? { [AUTOMATIONS_SERVICE_ACCOUNT_ID_VALUE]: serviceAccountIds.automations }
                : {}),
            },
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

  /**
   * Turns bound workflows an admin disabled back on. Installing keeps the enabled state of an
   * installed workflow, so a disabled entry point would otherwise leave the space not set up.
   */
  const enableDisabledWorkflows = async (
    request: KibanaRequest,
    spaceId: string,
    status: InvestigatorServiceAccountStatus
  ): Promise<boolean> => {
    const disabled = status.boundWorkflows.filter(
      ({ installed, enabled }) => installed && enabled === false
    );
    if (!workflowsManagement || disabled.length === 0) return false;
    for (const { workflowId } of disabled) {
      await workflowsManagement.management.updateWorkflow(
        workflowId,
        { enabled: true },
        spaceId,
        request
      );
    }
    return true;
  };

  const assertAllBound = (
    status: InvestigatorServiceAccountStatus,
    spaceId: string,
    agentServiceAccountId: string
  ): void => {
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
      ({ installed, runAs, valid }) =>
        !installed || (runAs !== agentServiceAccountId && valid !== false)
    );
    if (unbound.length > 0) {
      throw Boom.internal(
        `Nightshift setup in space [${spaceId}] did not bind ${unbound
          .map(({ workflowId, runAs }) => `[${workflowId}] (runs as ${runAs ?? 'the caller'})`)
          .join(', ')} to [${agentServiceAccountId}]`
      );
    }
    if (status.enabled !== true) {
      throw Boom.internal(
        `Nightshift setup in space [${spaceId}] left its entry point [${status.workflowId}] disabled`
      );
    }
  };

  const runEnable = async (
    request: KibanaRequest,
    spaceId: string,
    serviceAccountIds: NightshiftServiceAccountIds
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

    await installBoundWorkflows(request, spaceId, serviceAccountIds);
    const unboundAutomations = await bindAutomations(
      request,
      spaceId,
      serviceAccountIds.automations
    );

    let status = await getStatus(request, spaceId);
    if (await enableDisabledWorkflows(request, spaceId, status)) {
      status = await getStatus(request, spaceId);
    }
    assertAllBound(status, spaceId, serviceAccountIds.agent);
    logger.info(
      `Nightshift in space [${spaceId}] is set up with service accounts [${serviceAccountIds.agent}] and [${serviceAccountIds.automations}]`
    );
    if (unboundAutomations.length > 0) {
      logger.warn(
        `Nightshift setup in space [${spaceId}] left ${
          unboundAutomations.length
        } automation(s) running as their author: ${unboundAutomations
          .map(({ id }) => id)
          .join(', ')}`
      );
    }
    return unboundAutomations.length > 0 ? { ...status, unboundAutomations } : status;
  };

  /**
   * Sets up a space with the caller's privileges, bound to the given accounts. Binding a workflow
   * requires the caller to hold `manage_security`; the workflows plugin enforces that too.
   * Idempotent: running it again repairs a space whose workflows were removed, disabled or bound to
   * another account.
   */
  const enable = (
    request: KibanaRequest,
    spaceId: string,
    serviceAccountIds: NightshiftServiceAccountIds
  ): Promise<InvestigatorServiceAccountStatus> => {
    const previous = queues.get(spaceId) ?? Promise.resolve();
    const run = previous
      .catch(() => undefined)
      .then(() => runEnable(request, spaceId, serviceAccountIds));
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
    // The route opts out of Kibana authorization, and the delegated deletion only checks the
    // caller's cluster privileges, so the caller's access to this space is checked here.
    await assertSpaceExists(request, spaceId);
    if (!(await canManageSecurity(request))) {
      throw Boom.forbidden(
        'Removing the Nightshift service account setup requires the manage_security cluster privilege.'
      );
    }
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

  return {
    enable,
    disable,
    getStatus,
    canManageSecurity,
    resolveAutomationRunAs,
    assertCanModifyBoundAutomations,
  };
};

export type InvestigatorServiceAccountService = ReturnType<
  typeof createInvestigatorServiceAccountService
>;
