/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { parse as parseYaml } from 'yaml';
import type { CoreStart, ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { AgentAccessControlRole } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentAvailabilityConfig } from '@kbn/agent-builder-server/agents';
import {
  NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW_ID,
} from '@kbn/workflows/managed';
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
  getInvestigatorServiceAccountId,
  getNightshiftRoleName,
  getNightshiftRoleOfAccount,
  getNightshiftServiceAccountId,
  getNightshiftServiceAccountName,
  NIGHTSHIFT_ROLE_KINDS,
  NIGHTSHIFT_SERVICE_ACCOUNT_KINDS,
  type NightshiftServiceAccountKind,
} from './constants';
import { buildNightshiftRole, NIGHTSHIFT_ROLE_METADATA } from './roles';
import { NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID } from '../../agents/decision_tree_reinforcement';
import { installDecisionTreeReinforcementAgent } from '../install_decision_tree_reinforcement_agent';

interface Deps {
  core: CoreStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  workflowsManagement?: WorkflowsServerPluginSetup;
  spaces?: SpacesPluginStart;
  /** Set when decision trees are on, so the reinforcement agent exists and must admit the agent. */
  reinforcementAgent?: {
    agentBuilder: AgentBuilderPluginStart;
    availability: AgentAvailabilityConfig;
  };
  logger: Logger;
}

const ACCOUNT_DESCRIPTION: Record<NightshiftServiceAccountKind, string> = {
  agent: 'Runs Nightshift investigations, their sandbox tools and learning hooks.',
  relay: 'The Relay Slack bot: calls Agent Builder and workflows for Slack conversations.',
  automations: 'Matches Nightshift automation triggers and starts investigations.',
  detection: 'Runs Nightshift detections, KI discovery and onboarding.',
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

const getServiceAccounts = (spaceId: string): NightshiftServiceAccountInfo[] =>
  NIGHTSHIFT_SERVICE_ACCOUNT_KINDS.map((kind) => ({
    kind,
    id: getNightshiftServiceAccountId(kind, spaceId),
    role: getNightshiftRoleOfAccount(kind, spaceId),
  }));

/**
 * Creates or updates the space's roles. Roles Nightshift created are brought to the current
 * definition on every run, so a privilege change ships with the code. A role of the same name that
 * Nightshift did not create is never overwritten.
 */
const syncRoles = async (esClient: ElasticsearchClient, spaceId: string): Promise<void> => {
  for (const kind of NIGHTSHIFT_ROLE_KINDS) {
    const name = getNightshiftRoleName(kind, spaceId);
    let existing: { metadata?: Record<string, unknown> } | undefined;
    try {
      existing = (await esClient.security.getRole({ name }))[name];
    } catch (error) {
      if (getStatusCode(error) !== 404) throw error;
    }
    if (existing && existing.metadata?.managed_by !== NIGHTSHIFT_ROLE_METADATA.managed_by) {
      throw Boom.conflict(
        `Role [${name}] exists but was not created by Nightshift. Delete or rename it, then retry.`
      );
    }
    await esClient.security.putRole({ name, ...buildNightshiftRole(kind, spaceId) });
  }
};

/** Creates the account when missing. A name conflict means it already exists, and is reused. */
const ensureServiceAccount = async (
  core: CoreStart,
  request: KibanaRequest,
  kind: NightshiftServiceAccountKind,
  spaceId: string
): Promise<void> => {
  try {
    await core.security.serviceAccounts.create(request, {
      name: getNightshiftServiceAccountName(kind, spaceId),
      description: `${ACCOUNT_DESCRIPTION[kind]} Space [${spaceId}]. Created by Nightshift.`,
      roles: [getNightshiftRoleOfAccount(kind, spaceId)],
    });
  } catch (error) {
    if (getStatusCode(error) !== 409) throw error;
  }
};

export const createInvestigatorServiceAccountService = ({
  core,
  workflowsExtensions,
  workflowsManagement,
  spaces,
  reinforcementAgent,
  logger,
}: Deps) => {
  /**
   * The decision-tree reinforcement agent is private and system-owned, so only admins can see or
   * run it. Agent optimize runs it as the agent account, so the account gets the `user` role on it.
   * Granted here, by the admin setting the space up, rather than by making the agent shared.
   */
  const admitAgentToReinforcementAgent = async (
    request: KibanaRequest,
    spaceId: string
  ): Promise<void> => {
    if (!reinforcementAgent) return;
    const { agentBuilder, availability } = reinforcementAgent;
    await installDecisionTreeReinforcementAgent({ agentBuilder, spaceId, availability });
    const registry = await agentBuilder.agents.getRegistry({ request });
    const agent = await registry.get(NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID);
    const accountId = getInvestigatorServiceAccountId(spaceId);
    const principalId = `service_account:${accountId}`;
    const entries = agent.access_control?.entries ?? [];
    if (entries.some(({ id }) => id === principalId)) return;
    await registry.updateAccessControl(NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID, {
      entries: [
        ...entries,
        { type: 'user', id: principalId, name: accountId, role: AgentAccessControlRole.User },
      ],
    });
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
      bound: runAs === getInvestigatorServiceAccountId(spaceId),
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
    const byId = (id: BoundWorkflowId) => boundWorkflows[BOUND_WORKFLOW_IDS.indexOf(id)];
    const entryPoint = byId(NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID);
    return {
      serviceAccountsEnabled: core.security.serviceAccounts.isEnabled(),
      serviceAccountId: getInvestigatorServiceAccountId(spaceId),
      role: getNightshiftRoleOfAccount('agent', spaceId),
      workflowId: getBoundInvestigationWorkflowId(spaceId),
      installed: entryPoint.installed,
      enabled: entryPoint.enabled,
      bound: entryPoint.bound,
      slackThreadInstalled: byId(NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW_ID).installed,
      serviceAccounts: getServiceAccounts(spaceId),
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

  const runEnable = async (
    request: KibanaRequest,
    spaceId: string
  ): Promise<InvestigatorServiceAccountStatus> => {
    if (!core.security.serviceAccounts.isEnabled()) {
      throw Boom.badRequest(
        'Service accounts are disabled. Set xpack.security.serviceAccounts.enabled: true.'
      );
    }
    const esClient = core.elasticsearch.client.asScoped(request).asCurrentUser;
    const { has_all_requested: canManageSecurity } = await esClient.security.hasPrivileges({
      cluster: ['manage_security'],
    });
    if (!canManageSecurity) {
      throw Boom.forbidden(
        'Setting up the Nightshift service accounts requires the manage_security cluster privilege.'
      );
    }
    await assertSpaceExists(request, spaceId);

    await syncRoles(esClient, spaceId);
    for (const kind of NIGHTSHIFT_SERVICE_ACCOUNT_KINDS) {
      await ensureServiceAccount(core, request, kind, spaceId);
    }

    // Every bound workflow runs as the agent account. Installing again with a different account
    // (an earlier setup's) rebinds it.
    const serviceAccountId = getInvestigatorServiceAccountId(spaceId);
    const client = await workflowsExtensions.getClient(request);
    for (const id of BOUND_WORKFLOW_IDS) {
      try {
        await client.managedWorkflows.install(
          NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER,
          id,
          {
            spaceId,
            workflowIdSuffix: spaceId,
            values: { serviceAccountId },
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

    // After the installs: the agent is only available once the space's entry point is.
    await admitAgentToReinforcementAgent(request, spaceId);

    const status = await getStatus(request, spaceId);
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
          .join(', ')} to [${serviceAccountId}]`
      );
    }
    logger.info(
      `Nightshift in space [${spaceId}] now runs as service account [${serviceAccountId}]`
    );
    return status;
  };

  /**
   * Sets up a space with the caller's privileges: creates or updates its roles, creates its
   * service accounts if missing, and installs every bound workflow with `settings.run_as` set to
   * the agent account. Binding a workflow requires the caller to hold `manage_security`; the
   * workflows plugin enforces that too. Idempotent: running it again repairs a space whose
   * workflows were removed or bound to another account, and brings the roles up to date.
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
   * Uninstalls the bound workflows; the space can no longer run investigations. Accounts and roles
   * are kept, so `_enable` restores the space with the same identities.
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

  return { enable, disable, getStatus };
};

export type InvestigatorServiceAccountService = ReturnType<
  typeof createInvestigatorServiceAccountService
>;
