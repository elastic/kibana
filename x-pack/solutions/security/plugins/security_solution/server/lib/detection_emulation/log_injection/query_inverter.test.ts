/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { invertRuleQuery } from './query_inverter';

describe('QueryInverter', () => {
  it('inverts a simple KQL query', () => {
    const result = invertRuleQuery({
      id: 'rule-1',
      name: 'PowerShell Execution',
      type: 'query',
      language: 'kuery',
      query: 'process.name: "powershell.exe" and event.category: "process"',
    });

    expect(result.ruleType).toBe('query');
    expect(result.language).toBe('kuery');
    expect(result.events.length).toBe(1);
    expect(result.events[0].eventCategory).toBe('process');
    expect(result.events[0].constraints.length).toBeGreaterThan(0);
  });

  it('inverts an EQL single-event query', () => {
    const result = invertRuleQuery({
      id: 'rule-2',
      name: 'Process Start',
      type: 'eql',
      language: 'eql',
      query: 'process where process.name == "cmd.exe"',
    });

    expect(result.ruleType).toBe('eql');
    expect(result.language).toBe('eql');
    expect(result.events.length).toBe(1);
    expect(result.events[0].eventCategory).toBe('process');
    const nameCon = result.events[0].constraints.find((c) => c.field === 'process.name');
    expect(nameCon).toBeDefined();
    expect(nameCon?.value).toBe('cmd.exe');
  });

  it('inverts an EQL sequence query', () => {
    const result = invertRuleQuery({
      id: 'rule-3',
      name: 'Sequence Rule',
      type: 'eql',
      language: 'eql',
      query: `sequence by host.id
        [process where process.name == "cmd.exe"]
        [file where file.name == "evil.exe"]`,
    });

    expect(result.events.length).toBe(2);
    expect(result.sequenceJoinKeys).toContain('host.id');
  });

  it('handles lucene queries gracefully', () => {
    const result = invertRuleQuery({
      id: 'rule-4',
      name: 'Lucene Rule',
      type: 'query',
      language: 'lucene',
      query: 'process.name:powershell.exe',
    });

    expect(result.events.length).toBe(1);
    expect(result.events[0].constraints.length).toBe(0);
  });

  it('handles empty query', () => {
    const result = invertRuleQuery({
      id: 'rule-5',
      name: 'Empty Query',
      type: 'query',
      language: 'kuery',
      query: '',
    });

    expect(result.events.length).toBe(1);
  });
});
