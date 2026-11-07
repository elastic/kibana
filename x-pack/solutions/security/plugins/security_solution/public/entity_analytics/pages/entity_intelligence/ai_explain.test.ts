/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AI_EXPLAIN_FORMAT_INSTRUCTIONS,
  buildGraphExplainPrompt,
  buildTimelineExplainPrompt,
  parseAiExplain,
} from './ai_explain';

const REPLY = [
  'SUMMARY: A likely lateral-movement chain centered on jump-box-01.',
  'where a.rodriguez escalated privileges.',
  'ASSESSMENT: Active intrusion at the lateral-movement stage; intent likely persistence.',
  'STEP: logged in to jump-box-01 | medium | Suspicious sudo Escalation',
  'STEP: escalated via sudo | high | T1548',
  'STEP: pushed to docker host | critical |',
  'ENTITY: jump-box-01 | host',
  'ENTITY: a.rodriguez | user',
  'TACTIC: Privilege Escalation',
  'RATIONALE: Critical because a production host was reached.',
  'ACTION: Hunt a.rodriguez for lateral movement | hunt | a.rodriguez | user',
  'ACTION: Review alerts for T1548 | alerts | T1548 |',
  'ACTION: Confirm the escalation was authorized | none | |',
  'CONFIDENCE: medium',
].join('\n');

describe('parseAiExplain', () => {
  it('returns undefined for empty / non-string input', () => {
    expect(parseAiExplain('')).toBeUndefined();
    expect(parseAiExplain('   ')).toBeUndefined();
    // @ts-expect-error intentional wrong type
    expect(parseAiExplain(undefined)).toBeUndefined();
  });

  it('parses the labeled contract into structured graphics', () => {
    const result = parseAiExplain(REPLY);
    expect(result?.summary).toBe(
      'A likely lateral-movement chain centered on jump-box-01. where a.rodriguez escalated privileges.'
    );
    expect(result?.assessment).toBe(
      'Active intrusion at the lateral-movement stage; intent likely persistence.'
    );
    expect(result?.chain).toEqual([
      {
        label: 'logged in to jump-box-01',
        severity: 'medium',
        evidence: 'Suspicious sudo Escalation',
      },
      { label: 'escalated via sudo', severity: 'high', evidence: 'T1548' },
      { label: 'pushed to docker host', severity: 'critical', evidence: undefined },
    ]);
    expect(result?.entities).toEqual([
      { name: 'jump-box-01', kind: 'host' },
      { name: 'a.rodriguez', kind: 'user' },
    ]);
    expect(result?.tactics).toEqual(['Privilege Escalation']);
    expect(result?.severityRationale).toBe('Critical because a production host was reached.');
    expect(result?.confidence).toBe('medium');
  });

  it('parses actionable next steps with kind + target', () => {
    const result = parseAiExplain(REPLY);
    expect(result?.actions).toHaveLength(3);
    expect(result?.actions[0]).toEqual({
      label: 'Hunt a.rodriguez for lateral movement',
      action: 'hunt',
      targetName: 'a.rodriguez',
      targetKind: 'user',
      targetTechnique: undefined,
    });
    const alertsAction = result?.actions[1];
    expect(alertsAction?.action).toBe('alerts');
    expect(alertsAction?.targetTechnique).toBe('T1548');
    expect(result?.actions[2].action).toBe('none');
  });

  it('accepts the legacy NEXT label as a non-actionable step', () => {
    const result = parseAiExplain(
      ['SUMMARY: s', 'NEXT: Review sudo logs on jump-box-01'].join('\n')
    );
    expect(result?.actions[0]).toEqual({
      label: 'Review sudo logs on jump-box-01',
      action: 'none',
      targetName: undefined,
      targetKind: undefined,
      targetTechnique: undefined,
    });
  });

  it('tolerates list/bold markers and stray fences', () => {
    const messy = ['```', '- **SUMMARY:** hello world', '* STEP: did a thing | high', '```'].join(
      '\n'
    );
    const result = parseAiExplain(messy);
    expect(result?.summary).toBe('hello world');
    expect(result?.chain).toEqual([
      { label: 'did a thing', severity: 'high', evidence: undefined },
    ]);
  });

  it('drops an invalid severity / confidence rather than inventing one', () => {
    const result = parseAiExplain(
      ['SUMMARY: x', 'STEP: y | bogus', 'CONFIDENCE: maybe'].join('\n')
    );
    expect(result?.chain[0].severity).toBeUndefined();
    expect(result?.confidence).toBeUndefined();
  });

  it('returns undefined when there is no summary', () => {
    expect(parseAiExplain('STEP: no summary here | high')).toBeUndefined();
  });

  it('handles a step / entity with no pipe (label only)', () => {
    const result = parseAiExplain(
      ['SUMMARY: s', 'STEP: just a label', 'ENTITY: loneEntity'].join('\n')
    );
    expect(result?.chain[0]).toEqual({
      label: 'just a label',
      severity: undefined,
      evidence: undefined,
    });
    expect(result?.entities[0]).toEqual({ name: 'loneEntity', kind: undefined });
  });
});

describe('buildGraphExplainPrompt', () => {
  it('grounds the prompt in the focus entity, time range, neighbors, and rules', () => {
    const prompt = buildGraphExplainPrompt({
      focusName: 'jump-box-01',
      focusKind: 'host',
      timeRange: '30d',
      neighbors: [
        {
          name: 'a.rodriguez',
          kind: 'user',
          alertCount: 10,
          worstSeverity: 'high',
          activity: 'spawned process sudo',
        },
      ],
      alertRules: [
        {
          ruleName: 'Suspicious sudo Escalation on Jump Host',
          severity: 'high',
          tactic: 'Privilege Escalation',
        },
      ],
    });
    expect(prompt).toContain('Focus entity: host "jump-box-01"');
    expect(prompt).toContain('Time range: last 30d');
    expect(prompt).toContain(
      'user "a.rodriguez" (10 shared alerts, worst severity high, activity: spawned process sudo)'
    );
    expect(prompt).toContain(
      '- Suspicious sudo Escalation on Jump Host [high] {tactic: Privilege Escalation}'
    );
    // Anti-fabrication instructions are always present.
    expect(prompt).toContain(AI_EXPLAIN_FORMAT_INSTRUCTIONS);
    expect(prompt).toContain('Never invent entity names');
  });

  it('handles an empty neighborhood + no rules without breaking', () => {
    const prompt = buildGraphExplainPrompt({
      focusName: 'lonely',
      focusKind: 'host',
      timeRange: '7d',
      neighbors: [],
      alertRules: [],
    });
    expect(prompt).toContain('no related entities placed on the graph yet');
    expect(prompt).toContain('no detection rules on the focus entity');
  });
});

describe('buildTimelineExplainPrompt', () => {
  it('grounds the prompt in the ordered steps with alert linkage and tactics', () => {
    const prompt = buildTimelineExplainPrompt({
      focusName: 'LAPTOP-FIN03',
      focusKind: 'user',
      timeRange: '30d',
      totalSignificant: 2,
      steps: [
        {
          time: '2026-07-11T04:01:34.000Z',
          kind: 'event',
          label: 'spawned process winword.exe',
          category: 'process',
          severity: undefined,
          tactic: undefined,
          tiedToAlert: true,
          depth: 0,
        },
        {
          time: '2026-07-11T06:01:34.000Z',
          kind: 'alert',
          label: 'Credential Dumping via LSASS Memory Access',
          category: undefined,
          severity: 'critical',
          tactic: 'Credential Access',
          tiedToAlert: false,
          depth: 1,
        },
      ],
    });
    expect(prompt).toContain('Focus entity: user "LAPTOP-FIN03"');
    expect(prompt).toContain('process: spawned process winword.exe');
    expect(prompt).toContain('(tied to an alert)');
    expect(prompt).toContain(
      'ALERT: Credential Dumping via LSASS Memory Access [critical] {tactic: Credential Access}'
    );
    expect(prompt).toContain(AI_EXPLAIN_FORMAT_INSTRUCTIONS);
  });

  it('handles an empty timeline', () => {
    const prompt = buildTimelineExplainPrompt({
      focusName: 'x',
      focusKind: 'host',
      timeRange: '24h',
      totalSignificant: 0,
      steps: [],
    });
    expect(prompt).toContain('(no significant steps)');
  });
});
