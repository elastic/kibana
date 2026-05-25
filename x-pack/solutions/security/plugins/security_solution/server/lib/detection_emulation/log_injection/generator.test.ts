/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmulationPayload } from '../payloads';
import { generateDocs } from './generator';

const BASE_INPUT = {
  scenarioId: 'scenario-1',
  scenarioFingerprint: 'fp-abc123',
  hostId: 'host-1',
  hostName: 'test-host',
  userName: 'test-user',
  timestamp: '2024-01-01T00:00:00.000Z',
};

const makePayload = (techniqueId: string, command?: string): EmulationPayload => ({
  techniqueId,
  name: `${techniqueId} test payload`,
  agentTypes: ['endpoint'],
  command: 'runscript',
  parameters: command ? { command } : null,
  expectedSignals: [],
});

// All technique IDs covered by TECHNIQUE_TEMPLATES in generator.ts
const KNOWN_TECHNIQUES = [
  'T1059.001',
  'T1059.003',
  'T1059.004',
  'T1218.005',
  'T1218.011',
  'T1053.005',
  'T1547.001',
  'T1057',
  'T1003.001',
  'T1070.004',
  'T1071.001',
  'T1112',
];

// ─── event.dataset and event.module presence ─────────────────────────────────

describe('generateDocs — event.dataset and event.module', () => {
  it('emits event.dataset = "emulation.synthetic" on every document (all known techniques)', () => {
    const payloads = KNOWN_TECHNIQUES.map((id) => makePayload(id, 'whoami'));
    const docs = generateDocs({ ...BASE_INPUT, payloads });

    expect(docs).toHaveLength(KNOWN_TECHNIQUES.length);
    for (const doc of docs) {
      expect(doc.event.dataset).toBe('emulation.synthetic');
    }
  });

  it('emits event.module = "emulation" on every document (all known techniques)', () => {
    const payloads = KNOWN_TECHNIQUES.map((id) => makePayload(id, 'whoami'));
    const docs = generateDocs({ ...BASE_INPUT, payloads });

    for (const doc of docs) {
      expect(doc.event.module).toBe('emulation');
    }
  });

  it('emits event.dataset = "emulation.synthetic" for an unknown techniqueId (DEFAULT_TEMPLATE path)', () => {
    const docs = generateDocs({ ...BASE_INPUT, payloads: [makePayload('T9999.999')] });
    expect(docs[0].event.dataset).toBe('emulation.synthetic');
  });

  it('emits event.module = "emulation" for an unknown techniqueId (DEFAULT_TEMPLATE path)', () => {
    const docs = generateDocs({ ...BASE_INPUT, payloads: [makePayload('T9999.999')] });
    expect(docs[0].event.module).toBe('emulation');
  });

  it('preserves event.kind = "event" alongside the new fields', () => {
    const docs = generateDocs({ ...BASE_INPUT, payloads: [makePayload('T1059.001', 'pwsh')] });
    expect(docs[0].event.kind).toBe('event');
  });

  it('emits correct event.dataset and event.module when multiple payloads are provided', () => {
    const payloads = [
      makePayload('T1059.001', 'pwsh'),
      makePayload('T1547.001'),
      makePayload('T9999.000'),
    ];
    const docs = generateDocs({ ...BASE_INPUT, payloads });

    expect(docs).toHaveLength(3);
    for (const doc of docs) {
      expect(doc.event.dataset).toBe('emulation.synthetic');
      expect(doc.event.module).toBe('emulation');
    }
  });
});

// ─── event.dataset and event.module per-technique ────────────────────────────

describe('generateDocs — per-technique ECS stamp', () => {
  it.each(KNOWN_TECHNIQUES)('emits correct ECS stamp for technique %s', (techniqueId) => {
    const docs = generateDocs({ ...BASE_INPUT, payloads: [makePayload(techniqueId, 'test')] });
    expect(docs[0].event.dataset).toBe('emulation.synthetic');
    expect(docs[0].event.module).toBe('emulation');
  });
});
