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
// Serverless (UIAM) assigns opaque ids; nothing may derive them from the account names.
const AGENT_ACCOUNT = 'uiam-sa-7f3c2a';
const AUTOMATIONS_ACCOUNT = 'uiam-sa-91be04';
const IDS = { agent: AGENT_ACCOUNT, automations: AUTOMATIONS_ACCOUNT };
const ENTRY_POINT_ID = `${NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID}-${SPACE_ID}`;

const setup = ({
  serviceAccountsEnabled = true,
  canManageSecurity = true,
  isServerless = false,
  spaceExists = true,
  runAs = AGENT_ACCOUNT,
  enabled = true,
  installError,
  automations,
}: {
  serviceAccountsEnabled?: boolean;
  canManageSecurity?: boolean;
  isServerless?: boolean;
  spaceExists?: boolean;
  runAs?: string;
  enabled?: boolean;
  installError?: Error;
  /** Automation saved objects in the space; omit to run without automations. */
  automations?: Array<{ id: string; attributes: Record<string, unknown> }>;
} = {}) => {
  const automationsSoClient = {
    createPointInTimeFinder: jest.fn(() => ({
      async *find() {
        yield { saved_objects: automations ?? [] };
      },
      close: jest.fn(),
    })),
  };
  const esClient = {
    security: {
      hasPrivileges: jest.fn().mockResolvedValue({ has_all_requested: canManageSecurity }),
    },
  };
  const serviceAccounts = {
    isEnabled: jest.fn(() => serviceAccountsEnabled),
    create: jest.fn(),
  };
  const core = {
    security: { serviceAccounts },
    elasticsearch: { client: { asScoped: () => ({ asCurrentUser: esClient }) } },
  } as unknown as CoreStart;
  const state = { enabled, runAs };
  const managedWorkflows = {
    install: installError
      ? jest.fn().mockRejectedValue(installError)
      : jest.fn().mockResolvedValue(undefined),
    uninstall: jest.fn().mockResolvedValue(undefined),
    getWorkflowStatus: jest.fn(async () => ({ installed: true, enabled: state.enabled })),
  };
  const workflowsExtensions = {
    getClient: jest.fn().mockResolvedValue({ managedWorkflows }),
  } as unknown as WorkflowsExtensionsServerPluginStart;
  const getWorkflow = jest.fn(async (_id: string) => ({
    enabled: state.enabled,
    valid: true,
    definition: { settings: { run_as: state.runAs } },
  }));
  const updateWorkflow = jest.fn(
    async (_id: string, patch: { enabled?: boolean; yaml?: string }) => {
      if (patch.enabled !== undefined) state.enabled = patch.enabled;
      return {};
    }
  );
  const workflowsManagement = {
    management: { getWorkflow, updateWorkflow },
  } as unknown as WorkflowsServerPluginSetup;
  const getInstalledWorkflowState = jest.fn(async () => ({
    workflowId: ENTRY_POINT_ID,
    spaceId: SPACE_ID,
    definitionId: NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
    templateValues: {
      serviceAccountId: AGENT_ACCOUNT,
      automationsServiceAccountId: AUTOMATIONS_ACCOUNT,
    },
    documentVersion: 1,
  }));
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
    getInstalledWorkflowState,
    spaces,
    getAutomationsSoClient: automations ? () => automationsSoClient as never : undefined,
    isServerless,
    logger: loggingSystemMock.createLogger(),
  });
  return {
    service,
    esClient,
    serviceAccounts,
    managedWorkflows,
    getWorkflow,
    updateWorkflow,
  };
};

describe('createInvestigatorServiceAccountService', () => {
  it('binds the workflows to the accounts it is given, and keeps the automations account on the entry point', async () => {
    const { service, serviceAccounts, managedWorkflows } = setup();

    const status = await service.enable(request, SPACE_ID, IDS);

    // The caller finds or creates the accounts; setup only binds them.
    expect(serviceAccounts.create).not.toHaveBeenCalled();
    expect(managedWorkflows.install.mock.calls.map(([, id]) => id)).toEqual([
      ...BOUND_WORKFLOW_IDS,
    ]);
    for (const [, id, options] of managedWorkflows.install.mock.calls) {
      expect(options).toEqual({
        spaceId: SPACE_ID,
        workflowIdSuffix: SPACE_ID,
        values:
          id === NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID
            ? { serviceAccountId: AGENT_ACCOUNT, automationsServiceAccountId: AUTOMATIONS_ACCOUNT }
            : { serviceAccountId: AGENT_ACCOUNT },
      });
    }
    expect(status).toEqual(
      expect.objectContaining({
        serviceAccountId: AGENT_ACCOUNT,
        role: 'nightshift_agent',
        workflowId: ENTRY_POINT_ID,
        installed: true,
        enabled: true,
        bound: true,
      })
    );
    expect(status.serviceAccounts).toEqual([
      { kind: 'agent', name: 'nightshift_agent', id: AGENT_ACCOUNT, role: 'nightshift_agent' },
      {
        kind: 'automations',
        name: 'nightshift_automations',
        id: AUTOMATIONS_ACCOUNT,
        role: 'nightshift_automations',
      },
    ]);
    expect(status.boundWorkflows).toHaveLength(BOUND_WORKFLOW_IDS.length);
    expect(status.boundWorkflows.every(({ bound }) => bound)).toBe(true);
  });

  it('installs the entry point last, so a failed setup leaves the space reading as not set up', () => {
    expect(BOUND_WORKFLOW_IDS[BOUND_WORKFLOW_IDS.length - 1]).toBe(
      NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID
    );
  });

  it('reports the predefined role names on Serverless', async () => {
    const status = await setup({ isServerless: true }).service.getStatus(request, SPACE_ID);

    expect(status.role).toBe('_nightshift_agent');
    expect(status.serviceAccounts.map(({ role }) => role)).toEqual([
      '_nightshift_agent',
      '_nightshift_automations',
    ]);
  });

  it('turns a disabled entry point back on', async () => {
    const { service, updateWorkflow } = setup({ enabled: false });

    await expect(service.enable(request, SPACE_ID, IDS)).resolves.toMatchObject({ enabled: true });
    expect(updateWorkflow).toHaveBeenCalledWith(
      ENTRY_POINT_ID,
      { enabled: true },
      SPACE_ID,
      request
    );
  });

  it('refuses callers without manage_security before writing anything', async () => {
    const { service, managedWorkflows } = setup({ canManageSecurity: false });

    await expect(service.enable(request, SPACE_ID, IDS)).rejects.toMatchObject({
      output: { statusCode: 403 },
    });
    expect(managedWorkflows.install).not.toHaveBeenCalled();
  });

  it('refuses a space that does not exist before writing anything', async () => {
    const { service, managedWorkflows } = setup({ spaceExists: false });

    await expect(service.enable(request, SPACE_ID, IDS)).rejects.toMatchObject({
      output: { statusCode: 404 },
    });
    expect(managedWorkflows.install).not.toHaveBeenCalled();
  });

  it('refuses when service accounts are disabled', async () => {
    const { service } = setup({ serviceAccountsEnabled: false });

    await expect(service.enable(request, SPACE_ID, IDS)).rejects.toMatchObject({
      output: { statusCode: 400 },
    });
  });

  it('names the workflow whose install failed', async () => {
    const { service, managedWorkflows } = setup({ installError: new Error('boom') });

    await expect(service.enable(request, SPACE_ID, IDS)).rejects.toThrow(
      `Installing workflow [${BOUND_WORKFLOW_IDS[0]}] failed`
    );
    expect(managedWorkflows.install).toHaveBeenCalledTimes(1);
  });

  it('fails when a workflow did not end up bound to the given agent account', async () => {
    const { service } = setup({ runAs: 'uiam-sa-someone-else' });

    await expect(service.enable(request, SPACE_ID, IDS)).rejects.toThrow(
      /runs as uiam-sa-someone-else/
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

    await Promise.all([
      service.enable(request, SPACE_ID, IDS),
      service.enable(request, SPACE_ID, IDS),
    ]);

    expect(maxActive).toBe(1);
    expect(managedWorkflows.install).toHaveBeenCalledTimes(2 * BOUND_WORKFLOW_IDS.length);
  });

  it('reads the space account from its entry point', async () => {
    await expect(
      setup({ runAs: 'kibana/nightshift_agent' }).service.getStatus(request, SPACE_ID)
    ).resolves.toMatchObject({ serviceAccountId: 'kibana/nightshift_agent', bound: true });
  });

  it('reports whether the caller may modify bound workflows', async () => {
    await expect(setup().service.getStatus(request, SPACE_ID)).resolves.toMatchObject({
      canModifyBoundWorkflows: true,
    });
    await expect(
      setup({ canManageSecurity: false }).service.getStatus(request, SPACE_ID)
    ).resolves.toMatchObject({ canModifyBoundWorkflows: false });
  });

  it('uninstalls every bound workflow on disable, entry point first', async () => {
    const { service, managedWorkflows } = setup();

    await service.disable(request, SPACE_ID);

    expect(managedWorkflows.uninstall.mock.calls.map(([, id]) => id)).toEqual(
      [...BOUND_WORKFLOW_IDS].reverse()
    );
  });

  it('refuses to disable a space the caller cannot access', async () => {
    const { service, managedWorkflows } = setup({ spaceExists: false });

    await expect(service.disable(request, SPACE_ID)).rejects.toThrow(
      `Space [${SPACE_ID}] does not exist.`
    );
    expect(managedWorkflows.uninstall).not.toHaveBeenCalled();
  });

  it('refuses to disable without manage_security', async () => {
    const { service, managedWorkflows } = setup({ canManageSecurity: false });

    await expect(service.disable(request, SPACE_ID)).rejects.toThrow(/manage_security/);
    expect(managedWorkflows.uninstall).not.toHaveBeenCalled();
  });

  describe('automations', () => {
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
          ? {
              enabled: true,
              valid: true,
              definition: { settings: { run_as: AUTOMATIONS_ACCOUNT } },
            }
          : { enabled: true, valid: true, definition: { settings: { run_as: AGENT_ACCOUNT } } }
      );

      await service.enable(request, SPACE_ID, IDS);

      // a-2 is already bound; only a-1 is rewritten.
      expect(updateWorkflow).toHaveBeenCalledTimes(1);
      expect(updateWorkflow).toHaveBeenCalledWith(
        'wf-a-1',
        { yaml: expect.stringContaining(`run_as: ${AUTOMATIONS_ACCOUNT}`) },
        SPACE_ID,
        request
      );
    });

    it('keeps setting the space up when an automation cannot be bound, and reports it', async () => {
      const { service, updateWorkflow } = setup({
        automations: [automation('a-1'), automation('a-2')],
      });
      updateWorkflow.mockImplementation(async (workflowId: string) => {
        if (workflowId === 'wf-a-1') throw new Error('invalid');
        return {};
      });

      await expect(service.enable(request, SPACE_ID, IDS)).resolves.toMatchObject({
        bound: true,
        unboundAutomations: [{ id: 'a-1', name: 'a-1', error: 'invalid' }],
      });
    });

    it('reports no unbound automations when every one of them binds', async () => {
      const { service } = setup({ automations: [automation('a-1')] });

      await expect(service.enable(request, SPACE_ID, IDS)).resolves.not.toHaveProperty(
        'unboundAutomations'
      );
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
      const { service } = setup({ runAs: '' });

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
