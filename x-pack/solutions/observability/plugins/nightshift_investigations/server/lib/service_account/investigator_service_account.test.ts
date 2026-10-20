/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { BOUND_WORKFLOW_IDS } from './bound_workflows';
import { createInvestigatorServiceAccountService } from './investigator_service_account';

const request = {} as KibanaRequest;
const SPACE_ID = 'obs';
const AGENT_ACCOUNT = 'kibana/nightshift_agent';

const setup = ({
  serviceAccountsEnabled = true,
  canManageSecurity = true,
  isServerless = false,
  createError,
  spaceExists = true,
  runAs = AGENT_ACCOUNT,
  installError,
  reinforcementEntries,
  automations,
}: {
  serviceAccountsEnabled?: boolean;
  canManageSecurity?: boolean;
  isServerless?: boolean;
  createError?: Error;
  spaceExists?: boolean;
  runAs?: string;
  installError?: Error;
  /** Entries of the reinforcement agent; omit to run without decision trees. */
  reinforcementEntries?: Array<Record<string, unknown>>;
  /** Automation saved objects in the space; omit to run without automations. */
  automations?: Array<{ id: string; attributes: Record<string, unknown> }>;
} = {}) => {
  const updateWorkflow = jest.fn().mockResolvedValue({});
  const automationsSoClient = {
    createPointInTimeFinder: jest.fn(() => ({
      async *find() {
        yield { saved_objects: automations ?? [] };
      },
      close: jest.fn(),
    })),
  };
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
      putRole: jest.fn(),
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
    valid: true,
    definition: { settings: { run_as: runAs } },
  });
  const workflowsManagement = {
    management: { getWorkflow, updateWorkflow },
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
    getAutomationsSoClient: automations ? () => automationsSoClient as never : undefined,
    isServerless,
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
    updateWorkflow,
    agentBuilder,
    registry,
  };
};

describe('createInvestigatorServiceAccountService', () => {
  it('creates the Nightshift accounts with their built-in roles, then binds the workflows to the agent', async () => {
    const { service, esClient, serviceAccounts, managedWorkflows } = setup();

    const status = await service.enable(request, SPACE_ID);

    // Roles ship with Elasticsearch; Nightshift never writes them.
    expect(esClient.security.putRole).not.toHaveBeenCalled();
    expect(serviceAccounts.create.mock.calls.map(([, params]) => params)).toEqual([
      expect.objectContaining({ name: 'nightshift_agent', roles: ['nightshift_agent'] }),
      expect.objectContaining({
        name: 'nightshift_automations',
        roles: ['nightshift_automations'],
      }),
    ]);
    expect(managedWorkflows.install.mock.calls.map(([, id]) => id)).toEqual([
      ...BOUND_WORKFLOW_IDS,
    ]);
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
        role: 'nightshift_agent',
        workflowId: `${NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID}-${SPACE_ID}`,
        installed: true,
        bound: true,
      })
    );
    expect(status.boundWorkflows).toHaveLength(BOUND_WORKFLOW_IDS.length);
  });

  it('installs the entry point last, so a failed setup leaves the space reading as not set up', () => {
    expect(BOUND_WORKFLOW_IDS[BOUND_WORKFLOW_IDS.length - 1]).toBe(
      NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID
    );
  });

  it('gives accounts the predefined roles on Serverless', async () => {
    const { service, serviceAccounts } = setup({ isServerless: true });

    const status = await service.enable(request, SPACE_ID);

    expect(serviceAccounts.create.mock.calls.map(([, { roles }]) => roles)).toEqual([
      ['_nightshift_agent'],
      ['_nightshift_automations'],
    ]);
    expect(status.role).toBe('_nightshift_agent');
  });

  it('reuses accounts an earlier setup created', async () => {
    const { service, managedWorkflows } = setup({ createError: Boom.conflict('exists') });

    await expect(service.enable(request, SPACE_ID)).resolves.toMatchObject({ bound: true });
    expect(managedWorkflows.install).toHaveBeenCalledTimes(BOUND_WORKFLOW_IDS.length);
  });

  it('fails on other account creation errors', async () => {
    const { service, managedWorkflows } = setup({ createError: new Error('boom') });

    await expect(service.enable(request, SPACE_ID)).rejects.toThrow('boom');
    expect(managedWorkflows.install).not.toHaveBeenCalled();
  });

  it('refuses callers without manage_security before writing anything', async () => {
    const { service, serviceAccounts, managedWorkflows } = setup({ canManageSecurity: false });

    await expect(service.enable(request, SPACE_ID)).rejects.toMatchObject({
      output: { statusCode: 403 },
    });
    expect(serviceAccounts.create).not.toHaveBeenCalled();
    expect(managedWorkflows.install).not.toHaveBeenCalled();
  });

  it('refuses a space that does not exist before writing anything', async () => {
    const { service, serviceAccounts, managedWorkflows } = setup({ spaceExists: false });

    await expect(service.enable(request, SPACE_ID)).rejects.toMatchObject({
      output: { statusCode: 404 },
    });
    expect(serviceAccounts.create).not.toHaveBeenCalled();
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
      `Installing workflow [${BOUND_WORKFLOW_IDS[0]}] failed`
    );
    expect(managedWorkflows.install).toHaveBeenCalledTimes(1);
  });

  it('fails when a workflow did not end up bound to the agent account', async () => {
    const { service } = setup({ runAs: 'kibana/someone_else' });

    await expect(service.enable(request, SPACE_ID)).rejects.toThrow(/runs as kibana\/someone_else/);
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
    expect(managedWorkflows.install).toHaveBeenCalledTimes(2 * BOUND_WORKFLOW_IDS.length);
  });

  it('reports an entry point bound to another account as not bound', async () => {
    const { service } = setup({ runAs: 'kibana/someone_else' });

    await expect(service.getStatus(request, SPACE_ID)).resolves.toMatchObject({
      installed: true,
      bound: false,
    });
  });

  it('reports whether the caller may modify bound workflows', async () => {
    await expect(setup().service.getStatus(request, SPACE_ID)).resolves.toMatchObject({
      canModifyBoundWorkflows: true,
    });
    await expect(
      setup({ canManageSecurity: false }).service.getStatus(request, SPACE_ID)
    ).resolves.toMatchObject({ canModifyBoundWorkflows: false });
  });

  it('admits the agent account to the private reinforcement agent after the installs', async () => {
    const { service, managedWorkflows, agentBuilder, registry } = setup({
      reinforcementEntries: [{ type: 'user', id: 'u-1', role: 'manager' }],
    });
    registry.updateAccessControl.mockImplementation(async () => {
      // The agent is only available once the entry point is installed.
      expect(managedWorkflows.install).toHaveBeenCalledTimes(BOUND_WORKFLOW_IDS.length);
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

  it('uninstalls every bound workflow on disable, entry point first, and keeps the accounts', async () => {
    const { service, managedWorkflows, serviceAccounts } = setup();

    await service.disable(request, SPACE_ID);

    expect(managedWorkflows.uninstall.mock.calls.map(([, id]) => id)).toEqual(
      [...BOUND_WORKFLOW_IDS].reverse()
    );
    expect(serviceAccounts.create).not.toHaveBeenCalled();
  });

  describe('automations', () => {
    const AUTOMATIONS_ACCOUNT = 'kibana/nightshift_automations';
    const automation = (id: string) => ({
      id,
      attributes: {
        name: id,
        automationType: 'custom',
        isEnabled: true,
        workflowId: `wf-${id}`,
        trigger: { rows: [{ kind: 'alert' }] },
        execution: {},
        completions: [],
        runtime: {},
      },
    });

    it('binds existing automations to the automations account on setup', async () => {
      const { service, getWorkflow, updateWorkflow } = setup({
        automations: [automation('a-1'), automation('a-2')],
      });
      getWorkflow.mockImplementation(async (id: string) =>
        id === 'wf-a-2'
          ? { enabled: true, definition: { settings: { run_as: AUTOMATIONS_ACCOUNT } } }
          : { enabled: true, valid: true, definition: { settings: { run_as: AGENT_ACCOUNT } } }
      );

      await service.enable(request, SPACE_ID);

      // a-2 is already bound; only a-1 is rewritten.
      expect(updateWorkflow).toHaveBeenCalledTimes(1);
      expect(updateWorkflow).toHaveBeenCalledWith(
        'wf-a-1',
        { yaml: expect.stringContaining(`run_as: ${AUTOMATIONS_ACCOUNT}`) },
        SPACE_ID,
        request
      );
    });

    it('keeps setting the space up when an automation cannot be bound', async () => {
      const { service, updateWorkflow } = setup({ automations: [automation('a-1')] });
      updateWorkflow.mockRejectedValue(new Error('invalid'));

      await expect(service.enable(request, SPACE_ID)).resolves.toMatchObject({ bound: true });
    });

    it('runs automations as the automations account', async () => {
      const { service } = setup();

      await expect(service.resolveAutomationRunAs(request, SPACE_ID)).resolves.toBe(
        AUTOMATIONS_ACCOUNT
      );
    });

    it('leaves automations unbound while service accounts are off', async () => {
      const { service, esClient } = setup({ serviceAccountsEnabled: false });

      await expect(service.resolveAutomationRunAs(request, SPACE_ID)).resolves.toBeUndefined();
      expect(esClient.security.hasPrivileges).not.toHaveBeenCalled();
    });

    it('refuses automations in a space that is not set up', async () => {
      const { service } = setup({ runAs: 'kibana/someone_else' });

      await expect(service.resolveAutomationRunAs(request, SPACE_ID)).rejects.toMatchObject({
        output: { statusCode: 400 },
      });
    });

    it('refuses callers without manage_security', async () => {
      const { service } = setup({ canManageSecurity: false });

      await expect(service.resolveAutomationRunAs(request, SPACE_ID)).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
    });
  });
});
