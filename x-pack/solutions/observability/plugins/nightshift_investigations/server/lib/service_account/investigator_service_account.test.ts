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
  NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { createInvestigatorServiceAccountService } from './investigator_service_account';

const request = {} as KibanaRequest;
const SPACE_ID = 'obs';

const setup = ({
  serviceAccountsEnabled = true,
  canManageSecurity = true,
  roleExists = false,
  createError,
}: {
  serviceAccountsEnabled?: boolean;
  canManageSecurity?: boolean;
  roleExists?: boolean;
  createError?: Error;
} = {}) => {
  const esClient = {
    security: {
      hasPrivileges: jest.fn().mockResolvedValue({ has_all_requested: canManageSecurity }),
      getRole: roleExists
        ? jest.fn().mockResolvedValue({ nightshift_investigator: {} })
        : jest.fn().mockRejectedValue({ statusCode: 404 }),
      putRole: jest.fn().mockResolvedValue({}),
    },
  };
  const serviceAccounts = {
    isEnabled: jest.fn(() => serviceAccountsEnabled),
    create: createError
      ? jest.fn().mockRejectedValue(createError)
      : jest.fn().mockResolvedValue({ id: 'kibana/nightshift_investigator' }),
  };
  const core = {
    security: { serviceAccounts },
    elasticsearch: { client: { asScoped: () => ({ asCurrentUser: esClient }) } },
  } as unknown as CoreStart;
  const managedWorkflows = {
    install: jest.fn().mockResolvedValue(undefined),
    uninstall: jest.fn().mockResolvedValue(undefined),
    getWorkflowStatus: jest.fn().mockResolvedValue({ installed: true, enabled: true }),
  };
  const workflowsExtensions = {
    getClient: jest.fn().mockResolvedValue({ managedWorkflows }),
  } as unknown as WorkflowsExtensionsServerPluginStart;

  const service = createInvestigatorServiceAccountService({
    core,
    workflowsExtensions,
    logger: loggingSystemMock.createLogger(),
  });
  return { service, esClient, serviceAccounts, managedWorkflows };
};

describe('createInvestigatorServiceAccountService', () => {
  it('creates the role and account, then installs both bound workflows in the space', async () => {
    const { service, esClient, serviceAccounts, managedWorkflows } = setup();

    const status = await service.enable(request, SPACE_ID);

    expect(esClient.security.putRole).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'nightshift_investigator' })
    );
    expect(serviceAccounts.create).toHaveBeenCalledWith(request, {
      name: 'nightshift_investigator',
      description: expect.any(String),
      roles: ['nightshift_investigator'],
    });
    expect(managedWorkflows.install).toHaveBeenCalledWith(
      'nightshiftInvestigations',
      NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
      {
        spaceId: SPACE_ID,
        workflowIdSuffix: SPACE_ID,
        values: { serviceAccountId: 'kibana/nightshift_investigator' },
      }
    );
    expect(managedWorkflows.install).toHaveBeenCalledWith(
      'nightshiftInvestigations',
      NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW_ID,
      {
        spaceId: SPACE_ID,
        workflowIdSuffix: SPACE_ID,
        values: { serviceAccountId: 'kibana/nightshift_investigator', spaceId: SPACE_ID },
      }
    );
    expect(managedWorkflows.install.mock.calls[0][1]).toBe(
      NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID
    );
    expect(status).toEqual(
      expect.objectContaining({
        workflowId: `${NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID}-${SPACE_ID}`,
        installed: true,
      })
    );
  });

  it('reuses an existing role and account without overwriting them', async () => {
    const { service, esClient, managedWorkflows } = setup({
      roleExists: true,
      createError: Boom.conflict('exists'),
    });

    await service.enable(request, SPACE_ID);

    expect(esClient.security.putRole).not.toHaveBeenCalled();
    expect(managedWorkflows.install).toHaveBeenCalledWith(
      'nightshiftInvestigations',
      NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
      expect.objectContaining({ values: { serviceAccountId: 'kibana/nightshift_investigator' } })
    );
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

  it('refuses when service accounts are disabled', async () => {
    const { service } = setup({ serviceAccountsEnabled: false });

    await expect(service.enable(request, SPACE_ID)).rejects.toMatchObject({
      output: { statusCode: 400 },
    });
  });

  it('uninstalls both bound workflows on disable', async () => {
    const { service, managedWorkflows } = setup();

    await service.disable(request, SPACE_ID);

    expect(managedWorkflows.uninstall.mock.calls.map(([, id]) => id)).toEqual([
      NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW_ID,
      NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
    ]);
  });
});
