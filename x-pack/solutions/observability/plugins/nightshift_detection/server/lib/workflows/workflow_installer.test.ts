/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  NIGHTSHIFT_CONTINUOUS_DETECTION_WORKFLOW_ID as FIRST,
  NIGHTSHIFT_ONLINE_EVALS_WORKFLOW_ID as SECOND,
} from '@kbn/workflows/managed';
import type { ManagedWorkflowId } from '@kbn/workflows/managed';
import { WorkflowInstaller } from './workflow_installer';

const request = httpServerMock.createKibanaRequest();
const SPACE = 'default';
const ACCOUNT = 'account-1';

interface FakeWorkflow {
  enabled: boolean;
  runAs?: string;
}

/**
 * The installed workflows of one space, keyed by document id, behind the two plugin APIs the
 * installer uses. Tests read the resulting state instead of the calls.
 */
function createInstaller({
  workflows = {},
  installError,
  installRunsAs = ACCOUNT,
  failToTurnOn = [],
  rebindOnTurnOn,
}: {
  workflows?: Record<string, FakeWorkflow>;
  installError?: Error;
  /** The account an install leaves the workflow bound to, to act as an install that did not bind. */
  installRunsAs?: string;
  /** Workflow ids whose update fails. */
  failToTurnOn?: ManagedWorkflowId[];
  /** Makes turning a workflow on end with it running as another account. */
  rebindOnTurnOn?: string;
}) {
  const store = new Map<string, FakeWorkflow>(Object.entries(workflows));
  const documentId = (workflowId: ManagedWorkflowId) => `${workflowId}-${SPACE}`;
  const installer = new WorkflowInstaller(
    {
      getClient: async () => ({
        managedWorkflows: {
          install: async (_owner: string, workflowId: ManagedWorkflowId) => {
            if (installError) {
              throw installError;
            }
            store.set(documentId(workflowId), {
              enabled: store.get(documentId(workflowId))?.enabled ?? false,
              runAs: installRunsAs,
            });
          },
        },
      }),
    } as unknown as WorkflowsExtensionsServerPluginStart,
    {
      management: {
        getWorkflow: async (id: string) => {
          const workflow = store.get(id);
          return (
            workflow && {
              enabled: workflow.enabled,
              definition: { settings: { run_as: workflow.runAs } },
            }
          );
        },
        updateWorkflow: async (id: string, update: { enabled: boolean }) => {
          const workflow = store.get(id);
          if (!workflow) {
            throw new Error(`Workflow with id ${id} not found`);
          }
          if (update.enabled && failToTurnOn.some((workflowId) => id.startsWith(workflowId))) {
            throw new Error('could not turn it on');
          }
          store.set(id, {
            enabled: update.enabled,
            runAs: update.enabled && rebindOnTurnOn ? rebindOnTurnOn : workflow.runAs,
          });
        },
      },
    } as unknown as WorkflowsServerPluginSetup,
    loggingSystemMock.createLogger()
  );

  return {
    installer,
    isEnabled: (workflowId: ManagedWorkflowId) => store.get(documentId(workflowId))?.enabled,
  };
}

const scope = { request, spaceId: SPACE, serviceAccountId: ACCOUNT };

describe('WorkflowInstaller.install', () => {
  it('installs every listed workflow off, bound to the account', async () => {
    const { installer, isEnabled } = createInstaller({});

    await installer.install({ ...scope, workflowIds: [FIRST, SECOND] });

    expect(isEnabled(FIRST)).toBe(false);
    expect(isEnabled(SECOND)).toBe(false);
  });

  it('fails with 500 when an installed workflow does not run as the account, switching nothing on', async () => {
    const { installer, isEnabled } = createInstaller({ installRunsAs: 'another-account' });

    await expect(installer.install({ ...scope, workflowIds: [FIRST] })).rejects.toMatchObject({
      statusCode: 500,
    });
    expect(isEnabled(FIRST)).toBe(false);
  });

  it.each([
    { status: 403, error: Boom.forbidden('no manage_security'), hint: false },
    { status: 503, error: Boom.serverUnavailable('not ready'), hint: true },
  ])(
    'keeps the status $status of a failed install and suggests a retry only for server errors',
    async ({ status, error, hint }) => {
      const { installer } = createInstaller({ installError: error });

      const failure = await installer.install({ ...scope, workflowIds: [FIRST] }).catch((e) => e);

      expect(failure).toMatchObject({ statusCode: status });
      expect(failure.message.includes('_enable again')).toBe(hint);
    }
  );
});

describe('WorkflowInstaller.enable', () => {
  it('turns every installed workflow on', async () => {
    const { installer, isEnabled } = createInstaller({});
    await installer.install({ ...scope, workflowIds: [FIRST, SECOND] });

    await installer.enable({ ...scope, workflowIds: [FIRST, SECOND] });

    expect(isEnabled(FIRST)).toBe(true);
    expect(isEnabled(SECOND)).toBe(true);
  });

  it('turns off the workflows it just switched on when a later one cannot be turned on', async () => {
    const { installer, isEnabled } = createInstaller({
      workflows: {
        [`${FIRST}-${SPACE}`]: { enabled: false, runAs: ACCOUNT },
        [`${SECOND}-${SPACE}`]: { enabled: false, runAs: ACCOUNT },
      },
      failToTurnOn: [SECOND],
    });

    await expect(
      installer.enable({ ...scope, workflowIds: [FIRST, SECOND] })
    ).rejects.toMatchObject({ statusCode: 500, message: expect.stringContaining('_enable again') });
    expect(isEnabled(FIRST)).toBe(false);
  });

  it('leaves a workflow that was already on running when a later one cannot be turned on', async () => {
    const { installer, isEnabled } = createInstaller({
      workflows: {
        [`${FIRST}-${SPACE}`]: { enabled: true, runAs: ACCOUNT },
        [`${SECOND}-${SPACE}`]: { enabled: false, runAs: ACCOUNT },
      },
      failToTurnOn: [SECOND],
    });

    await installer.enable({ ...scope, workflowIds: [FIRST, SECOND] }).catch(() => undefined);

    expect(isEnabled(FIRST)).toBe(true);
  });

  it('fails with 500 and leaves the workflow on when a concurrent call rebound it meanwhile', async () => {
    const { installer, isEnabled } = createInstaller({
      workflows: { [`${FIRST}-${SPACE}`]: { enabled: false, runAs: ACCOUNT } },
      rebindOnTurnOn: 'account-2',
    });

    await expect(installer.enable({ ...scope, workflowIds: [FIRST] })).rejects.toMatchObject({
      statusCode: 500,
      message: expect.stringContaining('_enable again'),
    });
    // It runs for the call that won, so this one must not switch it off.
    expect(isEnabled(FIRST)).toBe(true);
  });

  it('suggests a retry when the workflow is gone by the time it is turned on', async () => {
    const { installer } = createInstaller({});

    await expect(installer.enable({ ...scope, workflowIds: [FIRST] })).rejects.toMatchObject({
      statusCode: 500,
      message: expect.stringContaining('_enable again'),
    });
  });
});
