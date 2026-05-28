/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assembleDocuments } from './document_assembler';
import type { InvertedRule } from './query_inverter';

describe('DocumentAssembler', () => {
  const defaultOptions = {
    scenarioId: 'test-scenario',
    scenarioFingerprint: 'fp-123',
    hostId: 'host-1',
    hostName: 'DESKTOP-TEST',
    userName: 'testuser',
    timestamp: '2024-01-01T12:00:00.000Z',
  };

  it('assembles a single-event rule into one document', () => {
    const rule: InvertedRule = {
      ruleId: 'rule-1',
      ruleName: 'Test Rule',
      ruleType: 'query',
      language: 'kuery',
      events: [
        {
          eventCategory: 'process',
          constraints: [
            { field: 'process.name', operator: '==', value: 'powershell.exe' },
            { field: 'process.command_line', operator: 'wildcard', value: '* -EncodedCommand *' },
          ],
          joinKeys: [],
        },
      ],
      sequenceJoinKeys: [],
    };

    const docs = assembleDocuments(rule, defaultOptions);
    expect(docs.length).toBe(1);

    const doc = docs[0];
    expect(doc.process.name).toBe('powershell.exe');
    expect(doc.process.command_line).toContain('-EncodedCommand');
    expect(doc.event.category).toEqual(['process']);
    expect(doc.kibana.alert.emulation.id).toBe('test-scenario');
    expect(doc.host.id).toBe('host-1');
    expect(doc.user.name).toBe('testuser');
  });

  it('assembles an EQL sequence rule into multiple documents', () => {
    const rule: InvertedRule = {
      ruleId: 'rule-2',
      ruleName: 'Sequence Rule',
      ruleType: 'eql',
      language: 'eql',
      events: [
        {
          eventCategory: 'process',
          constraints: [{ field: 'process.name', operator: '==', value: 'cmd.exe' }],
          joinKeys: ['host.id'],
        },
        {
          eventCategory: 'file',
          constraints: [{ field: 'file.name', operator: '==', value: 'payload.exe' }],
          joinKeys: ['host.id'],
        },
      ],
      sequenceJoinKeys: ['host.id'],
    };

    const docs = assembleDocuments(rule, defaultOptions);
    expect(docs.length).toBe(2);

    // Events should have the same host.id (join key)
    expect(docs[0].host.id).toBe(docs[1].host.id);

    // Timestamps should be ordered
    expect(new Date(docs[1]['@timestamp']).getTime()).toBeGreaterThan(
      new Date(docs[0]['@timestamp']).getTime()
    );
  });

  it('applies negated constraints correctly (skips them)', () => {
    const rule: InvertedRule = {
      ruleId: 'rule-3',
      ruleName: 'Negated Rule',
      ruleType: 'query',
      language: 'kuery',
      events: [
        {
          eventCategory: 'process',
          constraints: [
            { field: 'process.name', operator: '==', value: 'cmd.exe' },
            { field: 'process.name', operator: '!=', value: 'conhost.exe', negated: true },
          ],
          joinKeys: [],
        },
      ],
      sequenceJoinKeys: [],
    };

    const docs = assembleDocuments(rule, defaultOptions);
    expect(docs[0].process.name).toBe('cmd.exe');
  });

  it('includes entity_id and pid fields for process events', () => {
    const rule: InvertedRule = {
      ruleId: 'rule-4',
      ruleName: 'Process Rule',
      ruleType: 'query',
      language: 'kuery',
      events: [
        {
          eventCategory: 'process',
          constraints: [{ field: 'process.name', operator: '==', value: 'notepad.exe' }],
          joinKeys: [],
        },
      ],
      sequenceJoinKeys: [],
    };

    const docs = assembleDocuments(rule, defaultOptions);
    expect(docs[0].process.entity_id).toBeDefined();
    expect(docs[0].process.pid).toBeGreaterThan(0);
    expect(docs[0].process.parent.entity_id).toBeDefined();
    expect(docs[0].process.parent.pid).toBeGreaterThan(0);
  });

  it('infers windows OS from .exe process names', () => {
    const rule: InvertedRule = {
      ruleId: 'rule-5',
      ruleName: 'OS Inference',
      ruleType: 'query',
      language: 'kuery',
      events: [
        {
          eventCategory: 'process',
          constraints: [{ field: 'process.name', operator: '==', value: 'svchost.exe' }],
          joinKeys: [],
        },
      ],
      sequenceJoinKeys: [],
    };

    const docs = assembleDocuments(rule, { ...defaultOptions, os: undefined });
    expect(docs[0].host.os.type).toBe('windows');
  });
});
