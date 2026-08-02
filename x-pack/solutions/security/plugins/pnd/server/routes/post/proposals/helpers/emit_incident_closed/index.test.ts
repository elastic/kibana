/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  PND_GATE_IDS,
  PND_INCIDENT_CLOSED_TRIGGER_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  deriveConversationIds,
} from '@kbn/pnd-common';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

import { emitIncidentClosed } from '.';

const createWorkflowsExtensions = () => {
  const emitEvent = jest.fn().mockResolvedValue(undefined);
  const getClient = jest.fn().mockResolvedValue({ emitEvent });
  const workflowsExtensions = { getClient } as unknown as WorkflowsExtensionsServerPluginStart;
  return { emitEvent, getClient, workflowsExtensions };
};

const params = (overrides = {}) => ({
  event: { correlationId: 'ad-1' },
  gateId: PND_GATE_IDS.incidentContained,
  logger: loggerMock.create(),
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'agent-3',
  watchId: SYSTEM_SECURITY_WATCH_DEEP_ID,
  ...createWorkflowsExtensions(),
  ...overrides,
});

describe('emitIncidentClosed', () => {
  it('emits exactly one pnd.incidentClosed event', async () => {
    const p = params();

    await emitIncidentClosed(p);

    expect(p.emitEvent).toHaveBeenCalledTimes(1);
  });

  it('emits with the pnd.incidentClosed trigger id', async () => {
    const p = params();

    await emitIncidentClosed(p);

    expect(p.emitEvent).toHaveBeenCalledWith(PND_INCIDENT_CLOSED_TRIGGER_ID, expect.anything());
  });

  it('carries only ids and non-sensitive metadata in the payload (S6)', async () => {
    const p = params();

    await emitIncidentClosed(p);

    expect(p.emitEvent).toHaveBeenCalledWith(PND_INCIDENT_CLOSED_TRIGGER_ID, {
      correlationId: 'ad-1',
      incidentConversationId: deriveConversationIds('ad-1').incidentConversationId,
      spaceId: 'agent-3',
      watchId: SYSTEM_SECURITY_WATCH_DEEP_ID,
    });
  });

  it('scopes the emit client to the responding user request (space attribution)', async () => {
    const p = params();

    await emitIncidentClosed(p);

    expect(p.getClient).toHaveBeenCalledWith(p.request);
  });

  it('reports that it emitted', async () => {
    const p = params();

    expect(await emitIncidentClosed(p)).toEqual({ emitted: true });
  });

  it('does not throw when the emit fails (a Workflows failure must not fail the resume)', async () => {
    const failing = createWorkflowsExtensions();
    failing.emitEvent.mockRejectedValue(new Error('workflows down'));
    const p = params(failing);

    await expect(emitIncidentClosed(p)).resolves.toEqual({
      emitted: false,
      reason: 'emit_failed',
    });
  });

  it('logs an error when the emit fails', async () => {
    const failing = createWorkflowsExtensions();
    failing.emitEvent.mockRejectedValue(new Error('workflows down'));
    const logger = loggerMock.create();
    const p = params({ ...failing, logger });

    await emitIncidentClosed(p);

    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('names the attack discovery alert id in the emit-failure error', async () => {
    const failing = createWorkflowsExtensions();
    failing.emitEvent.mockRejectedValue(new Error('workflows down'));
    const logger = loggerMock.create();
    const p = params({ ...failing, logger });

    await emitIncidentClosed(p);

    expect(loggerMock.collect(logger).error).toEqual([[expect.stringContaining('ad-1')]]);
  });
});

// Finding R4: a manually-run Watch Floor (`watch_floor.yaml`'s `- type: manual` trigger) has no
// `correlationId` on its `context.event`. `''` fails the trigger schema's `min(1)`, so the
// emit could only ever throw — and the analyst still received `{ resumed: true }` with nothing
// anywhere saying the Detection Watch was never woken.
describe('emitIncidentClosed — manually-run watch, no correlationId (R4)', () => {
  it.each([
    ['an absent event', undefined],
    ['an event with no correlationId', {}],
    ['an empty correlationId', { correlationId: '' }],
    ['a whitespace-only correlationId', { correlationId: '   ' }],
    ['a non-string correlationId', { correlationId: 42 }],
  ])('does not attempt a doomed emit for %s', async (_label, event) => {
    const p = params({ event });

    await emitIncidentClosed(p);

    expect(p.emitEvent).not.toHaveBeenCalled();
  });

  it('reports that it did not emit, and why', async () => {
    const p = params({ event: undefined });

    expect(await emitIncidentClosed(p)).toEqual({
      emitted: false,
      reason: 'missing_attack_discovery_alert_id',
    });
  });

  it('warns rather than failing silently', async () => {
    const logger = loggerMock.create();
    const p = params({ event: undefined, logger });

    await emitIncidentClosed(p);

    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('names the gate in the warning', async () => {
    const logger = loggerMock.create();
    const p = params({ event: undefined, logger });

    await emitIncidentClosed(p);

    expect(loggerMock.collect(logger).warn).toEqual([
      [expect.stringContaining(PND_GATE_IDS.incidentContained)],
    ]);
  });

  it('names the watch in the warning', async () => {
    const logger = loggerMock.create();
    const p = params({ event: undefined, logger });

    await emitIncidentClosed(p);

    expect(loggerMock.collect(logger).warn).toEqual([
      [expect.stringContaining(SYSTEM_SECURITY_WATCH_DEEP_ID)],
    ]);
  });

  it('names the reason in the warning', async () => {
    const logger = loggerMock.create();
    const p = params({ event: undefined, logger });

    await emitIncidentClosed(p);

    expect(loggerMock.collect(logger).warn).toEqual([[expect.stringContaining('correlationId')]]);
  });

  it('does not log an error, because nothing failed unexpectedly', async () => {
    const logger = loggerMock.create();
    const p = params({ event: undefined, logger });

    await emitIncidentClosed(p);

    expect(logger.error).not.toHaveBeenCalled();
  });
});
