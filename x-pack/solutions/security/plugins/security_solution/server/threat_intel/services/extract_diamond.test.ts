/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { extractDiamond, extractDiamondLlmOutputSchema } from './extract_diamond';

const NONE_VERTEX = { signal: 'NONE' as const, summary: '' };
const HIGH_VERTEX = { signal: 'HIGH' as const, summary: 'FIN7 operators' };

/**
 * `withStructuredOutput` is called twice: once for the single-call schema and
 * once for the per-vertex schema. `singleCall` drives the first, `perVertex`
 * the second (invoked once per vertex, in order).
 */
const buildModel = ({
  singleCall,
  perVertex = [],
}: {
  singleCall: () => Promise<unknown>;
  perVertex?: Array<() => Promise<unknown>>;
}) => {
  const singleInvoke = jest.fn().mockImplementation(singleCall);
  let vertexCall = 0;
  const vertexInvoke = jest.fn().mockImplementation(() => {
    const next = perVertex[vertexCall] ?? (() => Promise.reject(new Error('no stub')));
    vertexCall += 1;
    return next();
  });

  let structuredCall = 0;
  const withStructuredOutput = jest.fn().mockImplementation(() => {
    structuredCall += 1;
    return structuredCall === 1 ? { invoke: singleInvoke } : { invoke: vertexInvoke };
  });

  const chatModel = { withStructuredOutput } as unknown as ScopedModel['chatModel'];
  const connector = { connectorId: 'test-connector' } as ScopedModel['connector'];

  return { model: { chatModel, connector } as ScopedModel, singleInvoke, vertexInvoke };
};

const ok = (parsed: unknown) => () => Promise.resolve({ raw: { response_metadata: {} }, parsed });
const fail = (message: string) => () => Promise.reject(new Error(message));

describe('extractDiamond', () => {
  const logger = loggingSystemMock.createLogger();
  const params = { text: 'FIN7 targeted a retail chain with Carbanak.' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the single-call result when it succeeds', async () => {
    const { model, vertexInvoke } = buildModel({
      singleCall: ok({
        adversary: HIGH_VERTEX,
        capability: NONE_VERTEX,
        infrastructure: NONE_VERTEX,
        victim: NONE_VERTEX,
      }),
    });

    const result = await extractDiamond(model, logger, params);

    expect(result.extraction_mode).toBe('single_call');
    expect(result.adversary).toEqual(HIGH_VERTEX);
    expect(vertexInvoke).not.toHaveBeenCalled();
  });

  it('falls back per vertex when the single call fails', async () => {
    const { model } = buildModel({
      singleCall: fail('context overflow'),
      perVertex: [ok(HIGH_VERTEX), fail('parse error'), ok(NONE_VERTEX), ok(NONE_VERTEX)],
    });

    const result = await extractDiamond(model, logger, params);

    expect(result.extraction_mode).toBe('per_vertex_fallback');
    expect(result.adversary).toEqual(HIGH_VERTEX);
    // The vertex that failed keeps the NONE default — one success is enough to
    // trust the rest.
    expect(result.capability).toEqual(NONE_VERTEX);
  });

  // Previously every vertex kept its fabricated NONE default and the service
  // still returned successfully, so the route answered 200 and the workflow
  // recorded a model outage as a completed extraction.
  it('throws when the single call and every per-vertex fallback fail', async () => {
    const { model } = buildModel({
      singleCall: fail('context overflow'),
      perVertex: [
        fail('model unavailable'),
        fail('model unavailable'),
        fail('model unavailable'),
        fail('last failure'),
      ],
    });

    await expect(extractDiamond(model, logger, params)).rejects.toThrow(
      /all 4 per-vertex fallbacks failed \(last error: last failure\)/
    );
  });

  it('still succeeds when the only successful vertex reports a legitimate NONE', async () => {
    const { model } = buildModel({
      singleCall: fail('context overflow'),
      perVertex: [ok(NONE_VERTEX), fail('nope'), fail('nope'), fail('nope')],
    });

    const result = await extractDiamond(model, logger, params);

    expect(result.extraction_mode).toBe('per_vertex_fallback');
    expect(result.signal_count).toBe(0);
  });
});

// Each vertex summary is mapped `semantic_text`, so its length is an embedding charge
// paid per report per vertex, four vertices deep. Nothing else in the pipeline caps it.
describe('extractDiamondLlmOutputSchema bounds', () => {
  const vertex = (summary: string) => ({ signal: 'HIGH' as const, summary });

  it('truncates an over-long vertex summary', () => {
    const parsed = extractDiamondLlmOutputSchema.parse({
      adversary: vertex('x'.repeat(50_000)),
      capability: vertex('ok'),
      infrastructure: vertex('ok'),
      victim: vertex('ok'),
    });
    expect(parsed.adversary.summary.length).toBe(4_000);
  });

  it('bounds every vertex, not just the first', () => {
    const long = 'x'.repeat(50_000);
    const parsed = extractDiamondLlmOutputSchema.parse({
      adversary: vertex(long),
      capability: vertex(long),
      infrastructure: vertex(long),
      victim: vertex(long),
    });
    for (const v of [parsed.adversary, parsed.capability, parsed.infrastructure, parsed.victim]) {
      expect(v.summary.length).toBe(4_000);
    }
  });

  it('leaves an ordinary summary untouched', () => {
    const parsed = extractDiamondLlmOutputSchema.parse({
      adversary: vertex('APT29'),
      capability: vertex('ok'),
      infrastructure: vertex('ok'),
      victim: vertex('ok'),
    });
    expect(parsed.adversary.summary).toBe('APT29');
  });
});
