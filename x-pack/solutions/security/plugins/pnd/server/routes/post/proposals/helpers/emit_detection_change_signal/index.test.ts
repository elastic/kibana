/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  DetectionChangeSignalEventSchema,
  PND_DETECTION_CHANGE_SIGNAL_MAX_GAP_DESCRIPTION_LENGTH,
  PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID,
  PND_GATE_IDS,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  deriveConversationIds,
} from '@kbn/pnd-common';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

import { resolveAttackDiscoveryTactics } from '../resolve_attack_discovery_tactics';
import { emitDetectionChangeSignal } from '.';

jest.mock('../resolve_attack_discovery_tactics');

const resolveAttackDiscoveryTacticsMock = resolveAttackDiscoveryTactics as jest.MockedFunction<
  typeof resolveAttackDiscoveryTactics
>;

const createWorkflowsExtensions = () => {
  const emitEvent = jest.fn().mockResolvedValue(undefined);
  const getClient = jest.fn().mockResolvedValue({ emitEvent });
  const workflowsExtensions = { getClient } as unknown as WorkflowsExtensionsServerPluginStart;
  return { emitEvent, getClient, workflowsExtensions };
};

const params = (overrides = {}) => ({
  evidenceConversationKind: 'incident' as const,
  event: { correlationId: 'ad-1' },
  gapDescription: 'No rule covers the scheduled-task persistence this incident used',
  gateId: PND_GATE_IDS.incidentContained,
  http: {} as unknown as HttpServiceStart,
  logger: loggerMock.create(),
  request: httpServerMock.createKibanaRequest(),
  sourceRunId: 'run-1',
  spaceId: 'agent-3',
  watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
  ...createWorkflowsExtensions(),
  ...overrides,
});

/** The payload the helper handed to `emitEvent`, for assertions that read one field. */
const emittedPayload = (emitEvent: jest.Mock): Record<string, unknown> =>
  emitEvent.mock.calls[0][1] as Record<string, unknown>;

describe('emitDetectionChangeSignal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveAttackDiscoveryTacticsMock.mockResolvedValue(['Initial Access', 'Persistence']);
  });

  it('emits exactly one security.detectionChangeSignal event', async () => {
    const p = params();

    await emitDetectionChangeSignal(p);

    expect(p.emitEvent).toHaveBeenCalledTimes(1);
  });

  it('emits with the security.detectionChangeSignal trigger id', async () => {
    const p = params();

    await emitDetectionChangeSignal(p);

    expect(p.emitEvent).toHaveBeenCalledWith(
      PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID,
      expect.anything()
    );
  });

  it('emits the whole claim payload', async () => {
    const p = params();

    await emitDetectionChangeSignal(p);

    expect(p.emitEvent).toHaveBeenCalledWith(PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID, {
      evidenceRefs: [
        { id: 'ad-1', kind: 'attack_discovery' },
        { id: deriveConversationIds('ad-1').incidentConversationId, kind: 'conversation' },
      ],
      gapDescription: 'No rule covers the scheduled-task persistence this incident used',
      sourceRunId: 'run-1',
      sourceWatchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
      spaceId: 'agent-3',
      tactics: ['Initial Access', 'Persistence'],
    });
  });

  it('cites the investigation conversation when the incident was never opened', async () => {
    const p = params({ evidenceConversationKind: 'investigation' });

    await emitDetectionChangeSignal(p);

    expect(emittedPayload(p.emitEvent).evidenceRefs).toEqual([
      { id: 'ad-1', kind: 'attack_discovery' },
      { id: deriveConversationIds('ad-1').investigationConversationId, kind: 'conversation' },
    ]);
  });

  // `.strict()` rejects unknown keys, so a payload that does not parse is a signal that never fires.
  it('emits a payload the trigger schema accepts', async () => {
    const p = params();

    await emitDetectionChangeSignal(p);

    expect(DetectionChangeSignalEventSchema.safeParse(emittedPayload(p.emitEvent)).success).toBe(
      true
    );
  });

  it('takes the tactics from the attack discovery document, resolved as the caller (S3)', async () => {
    const p = params();

    await emitDetectionChangeSignal(p);

    expect(resolveAttackDiscoveryTacticsMock).toHaveBeenCalledWith({
      correlationId: 'ad-1',
      http: p.http,
      request: p.request,
      spaceId: 'agent-3',
    });
  });

  it('emits the rationale verbatim as the gap description', async () => {
    const p = params({ gapDescription: 'the analyst wrote this' });

    await emitDetectionChangeSignal(p);

    expect(emittedPayload(p.emitEvent).gapDescription).toBe('the analyst wrote this');
  });

  it('clips an over-long gap description to the schema bound', async () => {
    const p = params({
      gapDescription: 'g'.repeat(PND_DETECTION_CHANGE_SIGNAL_MAX_GAP_DESCRIPTION_LENGTH + 100),
    });

    await emitDetectionChangeSignal(p);

    expect(emittedPayload(p.emitEvent).gapDescription).toHaveLength(
      PND_DETECTION_CHANGE_SIGNAL_MAX_GAP_DESCRIPTION_LENGTH
    );
  });

  // There is no measured confidence at containment, and inventing one is the failure mode the field
  // is optional to avoid.
  it('omits confidence rather than inventing one', async () => {
    const p = params();

    await emitDetectionChangeSignal(p);

    expect(emittedPayload(p.emitEvent)).not.toHaveProperty('confidence');
  });

  it('omits ruleRef, because the rule to tune is chosen downstream', async () => {
    const p = params();

    await emitDetectionChangeSignal(p);

    expect(emittedPayload(p.emitEvent)).not.toHaveProperty('ruleRef');
  });

  it('scopes the emit client to the responding user request (space attribution)', async () => {
    const p = params();

    await emitDetectionChangeSignal(p);

    expect(p.getClient).toHaveBeenCalledWith(p.request);
  });

  it('reports that it emitted', async () => {
    expect(await emitDetectionChangeSignal(params())).toEqual({ emitted: true });
  });

  it('does not throw when the emit fails (a Workflows failure must not fail the resume)', async () => {
    const failing = createWorkflowsExtensions();
    failing.emitEvent.mockRejectedValue(new Error('workflows down'));

    await expect(emitDetectionChangeSignal(params(failing))).resolves.toEqual({
      emitted: false,
      reason: 'emit_failed',
    });
  });

  it('names the attack discovery alert id in the emit-failure error', async () => {
    const failing = createWorkflowsExtensions();
    failing.emitEvent.mockRejectedValue(new Error('workflows down'));
    const logger = loggerMock.create();

    await emitDetectionChangeSignal(params({ ...failing, logger }));

    expect(loggerMock.collect(logger).error).toEqual([[expect.stringContaining('ad-1')]]);
  });

  it('does not throw when the emit client itself is unavailable', async () => {
    const failing = createWorkflowsExtensions();
    failing.getClient.mockRejectedValue(new Error('no client'));

    await expect(emitDetectionChangeSignal(params(failing))).resolves.toEqual({
      emitted: false,
      reason: 'emit_failed',
    });
  });
});

// `tactics` is permitted to be empty, so an unreadable or unreachable discovery costs the ATT&CK
// labels rather than the whole claim — but never silently (finding R4).
describe('emitDetectionChangeSignal — tactics degradation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveAttackDiscoveryTacticsMock.mockRejectedValue(new Error('_find unreachable'));
  });

  it('still emits when the tactics resolve fails', async () => {
    const p = params();

    await emitDetectionChangeSignal(p);

    expect(p.emitEvent).toHaveBeenCalledTimes(1);
  });

  it('emits empty tactics rather than inventing one', async () => {
    const p = params();

    await emitDetectionChangeSignal(p);

    expect(emittedPayload(p.emitEvent).tactics).toEqual([]);
  });

  it('warns that the signal went out without its tactics', async () => {
    const logger = loggerMock.create();

    await emitDetectionChangeSignal(params({ logger }));

    expect(loggerMock.collect(logger).warn).toEqual([[expect.stringContaining('tactics')]]);
  });

  it('does not throw when the tactics resolve fails', async () => {
    await expect(emitDetectionChangeSignal(params())).resolves.toEqual({ emitted: true });
  });
});

// The same R4 guard `emitIncidentClosed` carries: a manually-run watch has no discovery on its
// `context.event`, and `evidenceRefs` is `min(1)` with nothing else to cite.
describe('emitDetectionChangeSignal — manually-run watch, no correlationId (R4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveAttackDiscoveryTacticsMock.mockResolvedValue([]);
  });

  it.each([
    ['an absent event', undefined],
    ['an event with no correlationId', {}],
    ['an empty correlationId', { correlationId: '' }],
    ['a whitespace-only correlationId', { correlationId: '   ' }],
    ['a non-string correlationId', { correlationId: 42 }],
  ])('does not attempt a doomed emit for %s', async (_label, event) => {
    const p = params({ event });

    await emitDetectionChangeSignal(p);

    expect(p.emitEvent).not.toHaveBeenCalled();
  });

  it('does not resolve tactics for a discovery it does not have', async () => {
    await emitDetectionChangeSignal(params({ event: undefined }));

    expect(resolveAttackDiscoveryTacticsMock).not.toHaveBeenCalled();
  });

  it('reports that it did not emit, and why', async () => {
    expect(await emitDetectionChangeSignal(params({ event: undefined }))).toEqual({
      emitted: false,
      reason: 'missing_attack_discovery_alert_id',
    });
  });

  it('names the gate in the warning', async () => {
    const logger = loggerMock.create();

    await emitDetectionChangeSignal(params({ event: undefined, logger }));

    expect(loggerMock.collect(logger).warn).toEqual([
      [expect.stringContaining(PND_GATE_IDS.incidentContained)],
    ]);
  });

  it('names the watch in the warning', async () => {
    const logger = loggerMock.create();

    await emitDetectionChangeSignal(params({ event: undefined, logger }));

    expect(loggerMock.collect(logger).warn).toEqual([
      [expect.stringContaining(SYSTEM_SECURITY_WATCH_FLOOR_ID)],
    ]);
  });

  it('does not log an error, because nothing failed unexpectedly', async () => {
    const logger = loggerMock.create();

    await emitDetectionChangeSignal(params({ event: undefined, logger }));

    expect(logger.error).not.toHaveBeenCalled();
  });
});

// Unreachable through `_respond` (`RespondToProposalRequestBody` requires a non-empty rationale),
// but a coverage claim that says nothing is worse than no claim.
describe('emitDetectionChangeSignal — blank rationale', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveAttackDiscoveryTacticsMock.mockResolvedValue([]);
  });

  it.each([
    ['an empty rationale', ''],
    ['a whitespace-only rationale', '   '],
  ])('does not emit for %s', async (_label, gapDescription) => {
    const p = params({ gapDescription });

    await emitDetectionChangeSignal(p);

    expect(p.emitEvent).not.toHaveBeenCalled();
  });

  it('reports that it did not emit, and why', async () => {
    expect(await emitDetectionChangeSignal(params({ gapDescription: '' }))).toEqual({
      emitted: false,
      reason: 'missing_gap_description',
    });
  });

  it('warns rather than failing silently', async () => {
    const logger = loggerMock.create();

    await emitDetectionChangeSignal(params({ gapDescription: '', logger }));

    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
