/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EqlParser } from './parser';
import { extractEqlConstraints } from './constraint_extractor';
import type { SequenceQuery, EventQuery } from './types';

describe('EqlParser', () => {
  const parser = new EqlParser();

  describe('single event queries', () => {
    it('parses simple equality', () => {
      const ast = parser.parse('process where process.name == "regsvr32.exe"') as EventQuery;
      expect(ast.type).toBe('event_query');
      expect(ast.eventCategory).toBe('process');
      expect(ast.condition.type).toBe('comparison');
    });

    it('parses "any where true"', () => {
      const ast = parser.parse('any where true') as EventQuery;
      expect(ast.type).toBe('event_query');
      expect(ast.eventCategory).toBe('any');
      expect(ast.condition).toEqual({ type: 'literal', value: true, dataType: 'boolean' });
    });

    it('parses AND conditions', () => {
      const ast = parser.parse(
        'process where process.name == "powershell.exe" and process.args : "* -EncodedCommand *"'
      ) as EventQuery;
      expect(ast.condition.type).toBe('binary');
      if (ast.condition.type === 'binary') {
        expect(ast.condition.operator).toBe('and');
      }
    });

    it('parses OR conditions', () => {
      const ast = parser.parse(
        'process where process.name == "cmd.exe" or process.name == "powershell.exe"'
      ) as EventQuery;
      expect(ast.condition.type).toBe('binary');
      if (ast.condition.type === 'binary') {
        expect(ast.condition.operator).toBe('or');
      }
    });

    it('parses NOT conditions', () => {
      const ast = parser.parse(
        'process where not process.name == "explorer.exe"'
      ) as EventQuery;
      expect(ast.condition.type).toBe('unary');
      if (ast.condition.type === 'unary') {
        expect(ast.condition.operator).toBe('not');
      }
    });

    it('parses wildcard match (:)', () => {
      const ast = parser.parse(
        'process where process.command_line : "* -enc *"'
      ) as EventQuery;
      expect(ast.condition.type).toBe('wildcard_match');
    });

    it('parses in operator', () => {
      const ast = parser.parse(
        'process where process.name in ("cmd.exe", "powershell.exe", "pwsh.exe")'
      ) as EventQuery;
      expect(ast.condition.type).toBe('in');
    });

    it('parses not in operator', () => {
      const ast = parser.parse(
        'process where process.name not in ("explorer.exe", "svchost.exe")'
      ) as EventQuery;
      expect(ast.condition.type).toBe('in');
      if (ast.condition.type === 'in') {
        expect(ast.condition.negated).toBe(true);
      }
    });

    it('parses nested parenthesized expressions', () => {
      const ast = parser.parse(
        'process where (process.name == "cmd.exe" or process.name == "powershell.exe") and process.parent.name == "winword.exe"'
      ) as EventQuery;
      expect(ast.condition.type).toBe('binary');
    });

    it('parses function calls', () => {
      const ast = parser.parse(
        'process where length(process.command_line) > 500'
      ) as EventQuery;
      expect(ast.condition.type).toBe('comparison');
    });

    it('parses single = as equality (legacy EQL)', () => {
      const ast = parser.parse(
        'process where process.name = "test.exe"'
      ) as EventQuery;
      expect(ast.condition.type).toBe('comparison');
      if (ast.condition.type === 'comparison') {
        expect(ast.condition.operator).toBe('==');
      }
    });

    it('parses numeric comparisons', () => {
      const ast = parser.parse('process where process.pid >= 1000') as EventQuery;
      expect(ast.condition.type).toBe('comparison');
      if (ast.condition.type === 'comparison') {
        expect(ast.condition.operator).toBe('>=');
      }
    });
  });

  describe('sequence queries', () => {
    it('parses basic sequence', () => {
      const ast = parser.parse(
        'sequence [process where process.name == "mimikatz.exe"] [process where process.name == "explorer.exe"]'
      ) as SequenceQuery;
      expect(ast.type).toBe('sequence');
      expect(ast.terms).toHaveLength(2);
      expect(ast.terms[0].eventCategory).toBe('process');
      expect(ast.terms[1].eventCategory).toBe('process');
    });

    it('parses sequence with top-level by', () => {
      const ast = parser.parse(
        'sequence by host.id [process where process.name == "cmd.exe"] [network where true]'
      ) as SequenceQuery;
      expect(ast.type).toBe('sequence');
      expect(ast.joinKeys).toEqual(['host.id']);
      expect(ast.terms).toHaveLength(2);
    });

    it('parses sequence with maxspan', () => {
      const ast = parser.parse(
        'sequence with maxspan=10m [any where agent.type == "auditbeat"] [any where event.category == "network"]'
      ) as SequenceQuery;
      expect(ast.type).toBe('sequence');
      expect(ast.maxspan).toBe('10m');
      expect(ast.terms).toHaveLength(2);
    });

    it('parses sequence with by + maxspan', () => {
      const ast = parser.parse(
        'sequence by host.id with maxspan=5m [process where process.name == "cmd.exe"] [file where file.name : "*.bat"]'
      ) as SequenceQuery;
      expect(ast.type).toBe('sequence');
      expect(ast.joinKeys).toEqual(['host.id']);
      expect(ast.maxspan).toBe('5m');
      expect(ast.terms).toHaveLength(2);
    });

    it('parses sequence with per-term by', () => {
      const ast = parser.parse(
        'sequence [process where process.name == "cmd.exe"] by process.entity_id [network where true] by process.parent.entity_id'
      ) as SequenceQuery;
      expect(ast.terms[0].joinKeys).toEqual(['process.entity_id']);
      expect(ast.terms[1].joinKeys).toEqual(['process.parent.entity_id']);
    });

    it('parses sequence with until', () => {
      const ast = parser.parse(
        'sequence [process where process.name == "cmd.exe"] [file where true] until [process where event.action == "end"]'
      ) as SequenceQuery;
      expect(ast.type).toBe('sequence');
      expect(ast.until).toBeDefined();
      expect(ast.until?.eventCategory).toBe('process');
    });

    it('parses sequence with multiple join keys', () => {
      const ast = parser.parse(
        'sequence by host.id, user.name [process where true] [network where true]'
      ) as SequenceQuery;
      expect(ast.joinKeys).toEqual(['host.id', 'user.name']);
    });
  });
});

describe('extractEqlConstraints', () => {
  it('extracts equality constraints from single event query', () => {
    const result = extractEqlConstraints('process where process.name == "regsvr32.exe"');
    expect(result.type).toBe('single');
    expect(result.events).toHaveLength(1);
    expect(result.events[0].eventCategory).toBe('process');
    expect(result.events[0].constraints).toEqual([
      { field: 'event.category', operator: '==', value: 'process' },
      { field: 'process.name', operator: '==', value: 'regsvr32.exe', negated: false },
    ]);
  });

  it('extracts AND constraints (both sides)', () => {
    const result = extractEqlConstraints(
      'process where process.name == "powershell.exe" and user.name == "admin"'
    );
    const fields = result.events[0].constraints.map((c) => c.field);
    expect(fields).toContain('process.name');
    expect(fields).toContain('user.name');
  });

  it('extracts OR constraints (first branch heuristic)', () => {
    const result = extractEqlConstraints(
      'process where process.name == "cmd.exe" or process.name == "powershell.exe"'
    );
    const nameConstraint = result.events[0].constraints.find((c) => c.field === 'process.name');
    expect(nameConstraint).toBeDefined();
    expect(nameConstraint?.value).toBe('cmd.exe'); // picks first branch
  });

  it('extracts wildcard match constraints', () => {
    const result = extractEqlConstraints('process where process.command_line : "* -enc *"');
    const constraint = result.events[0].constraints.find((c) => c.field === 'process.command_line');
    expect(constraint?.operator).toBe('wildcard');
    expect(constraint?.value).toBe('* -enc *');
  });

  it('extracts in-list constraints', () => {
    const result = extractEqlConstraints(
      'process where process.name in ("cmd.exe", "powershell.exe")'
    );
    const constraint = result.events[0].constraints.find((c) => c.field === 'process.name');
    expect(constraint?.operator).toBe('in');
    expect(constraint?.value).toEqual(['cmd.exe', 'powershell.exe']);
  });

  it('extracts sequence constraints with join keys', () => {
    const result = extractEqlConstraints(
      'sequence by host.id [process where process.name == "cmd.exe"] [file where file.name : "*.bat"]'
    );
    expect(result.type).toBe('sequence');
    expect(result.sequenceJoinKeys).toEqual(['host.id']);
    expect(result.events).toHaveLength(2);
    expect(result.events[0].constraints).toContainEqual(
      expect.objectContaining({ field: 'process.name', value: 'cmd.exe' })
    );
    expect(result.events[1].constraints).toContainEqual(
      expect.objectContaining({ field: 'file.name', operator: 'wildcard', value: '*.bat' })
    );
  });

  it('extracts maxspan from sequence', () => {
    const result = extractEqlConstraints(
      'sequence with maxspan=10m [any where true] [any where true]'
    );
    expect(result.maxspan).toBe('10m');
  });

  it('handles "any where true" with no constraints except event category', () => {
    const result = extractEqlConstraints('any where true');
    expect(result.events[0].constraints).toHaveLength(0); // 'any' doesn't add event.category
  });

  it('handles "process where true" with only event.category', () => {
    const result = extractEqlConstraints('process where true');
    expect(result.events[0].constraints).toEqual([
      { field: 'event.category', operator: '==', value: 'process' },
    ]);
  });
});
