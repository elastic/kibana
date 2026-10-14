/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  NIGHTSHIFT_BOUND_AGENT_OPTIMIZE_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_DECISION_TREE_HYDRATE_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { createInvestigatorServiceAccountService } from './investigator_service_account';

const request = {} as KibanaRequest;
const SPACE_ID = 'obs';
const AGENT_ACCOUNT = 'kibana/nightshift-agent-obs';

const ALL_BOUND = [
  NIGHTSHIFT_BOUND_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_AGENT_OPTIMIZE_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_DECISION_TREE_HYDRATE_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
];

const setup = ({
  serviceAccountsEnabled = true,
  canManageSecurity = true,
  existingRoles = {},
  createError,
  spaceExists = true,
  runAs = AGENT_ACCOUNT,
  installError,
  reinforcementEntries,
}: {
  serviceAccountsEnabled?: boolean;
  canManageSecurity?: boolean;
  existingRoles?: Record<string, { metadata?: Record<string, unknown> }>;
  createError?: Error;
  spaceExists?: boolean;
  runAs?: string;
  installError?: Error;
  /** Entries of the reinforcement agent; omit to run without decision trees. */
  reinforcementEntries?: Array<Record<string, unknown>>;
} = {}) => {
  const registry = {
    get: jest.fn().mockResolvedValue({ access_control: { entries: reinforcementEntries ?? [] } }),
    updateAccessControl: jest.fn().mockResolvedValue({}),
  };
  const agentBuilder = {
    agents: {
      ensure: jest.fn().mockResolvedValue(undefined),
      getRegistry: jest.fn().mockResolvedValue(registry),
    },
  };
  const esClient = {
    security: {
      hasPrivileges: jest.fn().mockResolvedValue({ has_all_requested: canManageSecurity }),
      getRole: jest.fn(async ({ name }: { name: string }) => {
        if (existingRoles[name]) return { [name]: existingRoles[name] };
        throw Object.assign(new Error('not found'), { statusCode: 404 });
      }),
      putRole: jest.fn().mockResolvedValue({}),
    },
  };
  const serviceAccounts = {
    isEnabled: jest.fn(() => serviceAccountsEnabled),
    create: createError
      ? jest.fn().mockRejectedValue(createError)
      : jest.fn(async (_req: unknown, { name }: { name: string }) => ({ id: `kibana/${name}` })),
  };
  const core = {
    security: { serviceAccounts },
    elasticsearch: { client: { asScoped: () => ({ asCurrentUser: esClient }) } },
  } as unknown as CoreStart;
  const managedWorkflows = {
    install: installError
      ? jest.fn().mockRejectedValue(installError)
      : jest.fn().mockResolvedValue(undefined),
    uninstall: jest.fn().mockResolvedValue(undefined),
    getWorkflowStatus: jest.fn().mockResolvedValue({ installed: true, enabled: true }),
  };
  const workflowsExtensions = {
    getClient: jest.fn().mockResolvedValue({ managedWorkflows }),
  } as unknown as WorkflowsExtensionsServerPluginStart;
  const getWorkflow = jest.fn().mockResolvedValue({
    enabled: true,
    definition: { settings: { run_as: runAs } },
  });
  const workflowsManagement = {
    management: { getWorkflow },
  } as unknown as WorkflowsServerPluginSetup;
  const getSpace = spaceExists
    ? jest.fn().mockResolvedValue({ id: SPACE_ID })
    : jest.fn().mockRejectedValue(Boom.notFound());
  const spaces = {
    spacesService: { createSpacesClient: () => ({ get: getSpace }) },
  } as unknown as SpacesPluginStart;

  const service = createInvestigatorServiceAccountService({
    core,
    workflowsExtensions,
    workflowsManagement,
    spaces,
    reinforcementAgent: reinforcementEntries
      ? { agentBuilder: agentBuilder as never, availability: {} as never }
      : undefined,
    logger: loggingSystemMock.createLogger(),
  });
  return {
    service,
    esClient,
    serviceAccounts,
    managedWorkflows,
    getWorkflow,
    agentBuilder,
    registry,
  };
};

describe('createInvestigatorServiceAccountService', () => {
  it("creates the space's roles and accounts, then binds every workflow to the agent", async () => {
    const { service, esClient, serviceAccounts, managedWorkflows } = setup();

    const status = await service.enable(request, SPACE_ID);

    expect(esClient.security.putRole.mock.calls.map(([{ name }]) => name)).toEqual([
      'nightshift_agent_obs',
      'nightshift_automations_obs',
      'nightshift_detection_obs',
    ]);
    expect(serviceAccounts.create.mock.calls.map(([, params]) => params)).toEqual([
      expect.objectContaining({ name: 'nightshift-agent-obs', roles: ['nightshift_agent_obs'] }),
      expect.objectContaining({ name: 'relay-obs', roles: ['nightshift_agent_obs'] }),
      expect.objectContaining({
        name: 'nightshift-automations-obs',
        roles: ['nightshift_automations_obs'],
      }),
      expect.objectContaining({
        name: 'nightshift-detection-obs',
        roles: ['nightshift_detection_obs'],
      }),
    ]);
    // The entry point goes last, so a failed setup leaves the space reading as not set up.
    expect(managedWorkflows.install.mock.calls.map(([, id]) => id)).toEqual(ALL_BOUND);
    for (const [, , options] of managedWorkflows.install.mock.calls) {
      expect(options).toEqual({
        spaceId: SPACE_ID,
        workflowIdSuffix: SPACE_ID,
        values: { serviceAccountId: AGENT_ACCOUNT },
      });
    }
    expect(status).toEqual(
      expect.objectContaining({
        serviceAccountId: AGENT_ACCOUNT,
        role: 'nightshift_agent_obs',
        workflowId: `${NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID}-${SPACE_ID}`,
        installed: true,
        bound: true,
      })
    );
    expect(status.boundWorkflows).toHaveLength(ALL_BOUND.length);
  });

  it('scopes Kibana privileges to the space', async () => {
    const { service, esClient } = setup();

    await service.enable(request, SPACE_ID);

    for (const [{ applications }] of esClient.security.putRole.mock.calls) {
      expect(applications).toEqual([expect.objectContaining({ resources: ['space:obs'] })]);
    }
  });

  it('updates roles it created and reuses existing accounts', async () => {
    const { service, esClient, managedWorkflows } = setup({
      existingRoles: { nightshift_agent_obs: { metadata: { managed_by: 'nightshift' } } },
      createError: Boom.conflict('exists'),
    });

    await service.enable(request, SPACE_ID);

    expect(esClient.security.putRole).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'nightshift_agent_obs' })
    );
    expect(managedWorkflows.install).toHaveBeenCalledTimes(ALL_BOUND.length);
  });

  it('never overwrites a role Nightshift did not create', async () => {
    const { service, esClient, managedWorkflows } = setup({
      existingRoles: { nightshift_agent_obs: { metadata: {} } },
    });

    await expect(service.enable(request, SPACE_ID)).rejects.toMatchObject({
      output: { statusCode: 409 },
    });
    expect(esClient.security.putRole).not.toHaveBeenCalled();
    expect(managedWorkflows.install).not.toHaveBeenCalled();
  });

  it('refuses callers without manage_security before writing anything', async () => {
    const { service, esClient, serviceAccounts, managedWorkflows } = setup({
      canManageSecurity: false,
    });

    await expect(service.enable(request, SPACE_ID)).rejects.toMatchObject({
      output: { statusCode: 403 },
    });
    expect(esClient.security.putRole).not.toHaveBeenCalled();
    expect(serviceAccounts.create).not.toHaveBeenCalled();
    expect(managedWorkflows.install).not.toHaveBeenCalled();
  });

  it('refuses a space that does not exist before writing anything', async () => {
    const { service, esClient, managedWorkflows } = setup({ spaceExists: false });

    await expect(service.enable(request, SPACE_ID)).rejects.toMatchObject({
      output: { statusCode: 404 },
    });
    expect(esClient.security.putRole).not.toHaveBeenCalled();
    expect(managedWorkflows.install).not.toHaveBeenCalled();
  });

  it('refuses when service accounts are disabled', async () => {
    const { service } = setup({ serviceAccountsEnabled: false });

    await expect(service.enable(request, SPACE_ID)).rejects.toMatchObject({
      output: { statusCode: 400 },
    });
  });

  it('names the workflow whose install failed', async () => {
    const { service, managedWorkflows } = setup({ installError: new Error('boom') });

    await expect(service.enable(request, SPACE_ID)).rejects.toThrow(
      `Installing workflow [${NIGHTSHIFT_BOUND_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID}] failed`
    );
    expect(managedWorkflows.install).toHaveBeenCalledTimes(1);
  });

  it('fails when a workflow did not end up bound to the agent account', async () => {
    const { service } = setup({ runAs: 'kibana/nightshift_investigator' });

    await expect(service.enable(request, SPACE_ID)).rejects.toThrow(
      /runs as kibana\/nightshift_investigator/
    );
  });

  it('runs concurrent setups of one space one after another', async () => {
    const { service, managedWorkflows } = setup();
    let active = 0;
    let maxActive = 0;
    managedWorkflows.install.mockImplementation(async () => {
      maxActive = Math.max(maxActive, ++active);
      await new Promise((resolve) => setImmediate(resolve));
      active--;
    });

    await Promise.all([service.enable(request, SPACE_ID), service.enable(request, SPACE_ID)]);

    expect(maxActive).toBe(1);
    expect(managedWorkflows.install).toHaveBeenCalledTimes(2 * ALL_BOUND.length);
  });

  it('reports an entry point bound to another account as not bound', async () => {
    const { service } = setup({ runAs: 'kibana/nightshift_investigator' });

    await expect(service.getStatus(request, SPACE_ID)).resolves.toMatchObject({
      installed: true,
      bound: false,
    });
  });

  it('uninstalls every bound workflow on disable, entry point first', async () => {
    const { service, managedWorkflows } = setup();

    await service.disable(request, SPACE_ID);

    expect(managedWorkflows.uninstall.mock.calls.map(([, id]) => id)).toEqual(
      [...ALL_BOUND].reverse()
    );
  });

  it('admits the agent account to the private reinforcement agent after the installs', async () => {
    const { service, managedWorkflows, agentBuilder, registry } = setup({
      reinforcementEntries: [{ type: 'user', id: 'u-1', role: 'manager' }],
    });
    registry.updateAccessControl.mockImplementation(async () => {
      // The agent is only available once the entry point is installed.
      expect(managedWorkflows.install).toHaveBeenCalledTimes(ALL_BOUND.length);
      return {};
    });

    await service.enable(request, SPACE_ID);

    expect(agentBuilder.agents.ensure).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: SPACE_ID })
    );
    expect(registry.updateAccessControl).toHaveBeenCalledWith(
      'significant-events.decision-tree-reinforcement',
      {
        entries: [
          { type: 'user', id: 'u-1', role: 'manager' },
          {
            type: 'user',
            id: `service_account:${AGENT_ACCOUNT}`,
            name: AGENT_ACCOUNT,
            role: 'user',
          },
        ],
      }
    );
  });

  it('leaves the reinforcement agent alone once the account is admitted', async () => {
    const { service, registry } = setup({
      reinforcementEntries: [
        { type: 'user', id: `service_account:${AGENT_ACCOUNT}`, role: 'user' },
      ],
    });

    await service.enable(request, SPACE_ID);

    expect(registry.updateAccessControl).not.toHaveBeenCalled();
  });
});
