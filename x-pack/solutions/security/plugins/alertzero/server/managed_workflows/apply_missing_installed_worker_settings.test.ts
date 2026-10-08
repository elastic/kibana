/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  RULE_TUNING_DEFAULT_EXTRAS,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
} from '@kbn/alertzero-common';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { applyMissingInstalledWorkerSettings } from './apply_missing_installed_worker_settings';

const TUNING = SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID;

const storedWithoutExtras = {
  settingsVersion: 1,
  autonomyLevel: 'manual',
  scheduleInterval: '2h',
};

const makeState = (templateValues: Record<string, unknown>) => ({
  workflowId: 'wf-tuning',
  spaceId: 'default',
  definitionId: TUNING,
  templateValues,
  documentVersion: 4,
});

const createClient = (templateValues: Record<string, unknown>) => {
  const client = {
    listInstalledWorkflowStates: jest.fn(async () => [makeState(templateValues)]),
    install: jest.fn(async () => undefined),
  };
  return client as unknown as PluginScopedManagedWorkflowsApi & {
    install: jest.Mock;
  };
};

describe('applyMissingInstalledWorkerSettings', () => {
  it('fills missing extras on a worker that has no service account', async () => {
    const client = createClient(storedWithoutExtras);
    const logger = loggerMock.create();

    await applyMissingInstalledWorkerSettings(client, logger);

    expect(client.install).toHaveBeenCalledWith(TUNING, {
      spaceId: 'default',
      workflowId: 'wf-tuning',
      expectedDocumentVersion: 4,
      values: {
        ...storedWithoutExtras,
        extras: RULE_TUNING_DEFAULT_EXTRAS,
      },
    });
  });

  it('does not rewrite a worker that already has a service account', async () => {
    const client = createClient({
      ...storedWithoutExtras,
      serviceAccountId: 'kibana/az-worker-1',
    });
    const logger = loggerMock.create();

    await applyMissingInstalledWorkerSettings(client, logger);

    expect(client.install).not.toHaveBeenCalled();
  });

  it('logs why a bound worker keeps its stored settings', async () => {
    const client = createClient({
      ...storedWithoutExtras,
      serviceAccountId: 'kibana/az-worker-1',
    });
    const logger = loggerMock.create();

    await applyMissingInstalledWorkerSettings(client, logger);

    expect(logger.warn).toHaveBeenCalledWith(
      'Skipping missing setting defaults for AlertZero worker "wf-tuning" in space "default": it has a service account, and boot cannot rewrite a bound workflow without an authenticated request'
    );
  });

  it('leaves a complete bound worker alone', async () => {
    const client = createClient({
      ...storedWithoutExtras,
      extras: RULE_TUNING_DEFAULT_EXTRAS,
      serviceAccountId: 'kibana/az-worker-1',
    });
    const logger = loggerMock.create();

    await applyMissingInstalledWorkerSettings(client, logger);

    expect(client.install).not.toHaveBeenCalled();
  });
});
