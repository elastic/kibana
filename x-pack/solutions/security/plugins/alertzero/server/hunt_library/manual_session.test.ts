/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { normalizeExecutionLabels } from '@kbn/workflows';
import {
  buildManualSessionIdentityLabels,
  deriveManualSessionExecutionId,
  HuntSessionConflictError,
  launchManualSession,
  MANUAL_SESSION_IMMUTABLE_LABEL_KEYS,
} from './manual_session';
import { getHuntDefinition } from './seed';

const definition = getHuntDefinition('rare_lsass_process_access')!;
const other = getHuntDefinition('okta_password_spraying_repeat_source')!;
const SESSION = '0b7c1a3e-5d2f-4c8a-9e61-3f4b8a7d2c10';

const makeClient = () => ({
  findExecutionsByLabel: jest.fn().mockResolvedValue([]),
  executeLabeledWorkflow: jest
    .fn()
    .mockResolvedValue({ workflowExecutionId: 'x', reusedExisting: false }),
  updateExecutionLabels: jest.fn().mockResolvedValue({}),
});

const launch = (client: ReturnType<typeof makeClient>, overrides = {}) =>
  launchManualSession({
    client: client as never,
    request: httpServerMock.createKibanaRequest(),
    spaceId: 'default',
    definition,
    sessionId: SESSION,
    logger: loggingSystemMock.createLogger(),
    ...overrides,
  });

describe('deriveManualSessionExecutionId', () => {
  const base = {
    spaceId: 'default',
    definitionId: 'h',
    definitionVersion: 1,
    sessionId: SESSION,
  };

  it('is stable for the same session and differs by space, definition, version and session', () => {
    const id = deriveManualSessionExecutionId(base);

    expect(deriveManualSessionExecutionId(base)).toBe(id);
    expect(deriveManualSessionExecutionId({ ...base, spaceId: 'other' })).not.toBe(id);
    expect(deriveManualSessionExecutionId({ ...base, definitionId: 'i' })).not.toBe(id);
    expect(deriveManualSessionExecutionId({ ...base, definitionVersion: 2 })).not.toBe(id);
    expect(deriveManualSessionExecutionId({ ...base, sessionId: 'other' })).not.toBe(id);
  });

  it('produces a UUID', () => {
    expect(deriveManualSessionExecutionId(base)).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('buildManualSessionIdentityLabels', () => {
  it('carries exactly the immutable identity keys, within the label bounds', () => {
    const labels = buildManualSessionIdentityLabels({ definition, sessionId: SESSION });

    expect(Object.keys(labels).sort()).toEqual([...MANUAL_SESSION_IMMUTABLE_LABEL_KEYS].sort());
    expect(() => normalizeExecutionLabels(labels)).not.toThrow();
    expect(labels['hunt.definition_version']).toBe(String(definition.version));
  });

  it('never carries query text, filters or rows', () => {
    const serialized = JSON.stringify(
      buildManualSessionIdentityLabels({ definition, sessionId: SESSION })
    );

    expect(serialized).not.toContain('FROM');
    expect(serialized).not.toContain(definition.query.query.slice(0, 20));
  });
});

describe('launchManualSession', () => {
  it('starts the manual session workflow with a derived id, identity labels and the AlertZero owner', async () => {
    const client = makeClient();

    const result = await launch(client);

    const expectedId = deriveManualSessionExecutionId({
      spaceId: 'default',
      definitionId: definition.id,
      definitionVersion: definition.version,
      sessionId: SESSION,
    });
    expect(result).toEqual({ sessionId: SESSION, executionId: expectedId, reusedExisting: false });
    expect(client.executeLabeledWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID,
        spaceId: 'default',
        executionId: expectedId,
        labelOwnerId: 'alertzero',
        labels: buildManualSessionIdentityLabels({ definition, sessionId: SESSION }),
        inputs: {
          definitionId: definition.id,
          definitionVersion: definition.version,
          sessionId: SESSION,
        },
      })
    );
  });

  it('records the exploratory outcome after creating the execution', async () => {
    const client = makeClient();

    await launch(client);

    expect(client.updateExecutionLabels).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID,
        labels: { 'hunt.outcome': 'exploratory' },
        immutableKeys: MANUAL_SESSION_IMMUTABLE_LABEL_KEYS,
      })
    );
  });

  it('still succeeds when the outcome label cannot be written', async () => {
    const client = makeClient();
    client.updateExecutionLabels.mockRejectedValue(new Error('conflict'));

    await expect(launch(client)).resolves.toMatchObject({ reusedExisting: false });
  });

  it('reuses the execution on a retry and does not rewrite its outcome', async () => {
    const client = makeClient();
    client.executeLabeledWorkflow.mockResolvedValue({
      workflowExecutionId: 'x',
      reusedExisting: true,
    });

    const result = await launch(client);

    expect(result.reusedExisting).toBe(true);
    expect(client.updateExecutionLabels).not.toHaveBeenCalled();
  });

  it('accepts a session id that already belongs to the same definition and version', async () => {
    const client = makeClient();
    client.findExecutionsByLabel.mockResolvedValue([
      {
        labels: {
          'hunt.definition_id': definition.id,
          'hunt.definition_version': String(definition.version),
        },
      },
    ]);

    await expect(launch(client)).resolves.toBeDefined();
  });

  it('rejects a session id that belongs to a different definition or version, before any write', async () => {
    const client = makeClient();
    client.findExecutionsByLabel.mockResolvedValue([
      {
        labels: {
          'hunt.definition_id': other.id,
          'hunt.definition_version': String(other.version),
        },
      },
    ]);

    await expect(launch(client)).rejects.toBeInstanceOf(HuntSessionConflictError);
    expect(client.executeLabeledWorkflow).not.toHaveBeenCalled();

    client.findExecutionsByLabel.mockResolvedValue([
      {
        labels: {
          'hunt.definition_id': definition.id,
          'hunt.definition_version': String(definition.version + 1),
        },
      },
    ]);
    await expect(launch(client)).rejects.toBeInstanceOf(HuntSessionConflictError);
  });

  it('looks the session up in the launch space', async () => {
    const client = makeClient();

    await launch(client, { spaceId: 'hunt-space' });

    expect(client.findExecutionsByLabel).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'hunt-space',
        key: 'hunt.session_id',
        value: SESSION,
        workflowId: ALERTZERO_HUNT_MANUAL_SESSION_WORKFLOW_ID,
      })
    );
  });
});
