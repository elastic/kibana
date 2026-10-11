/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  AttentionArea,
  BriefSnapshot,
  ExecutiveBriefJob,
} from '../../../../../common/entity_analytics/executive_brief/types';
import realJob from '../__fixtures__/real_job.json';
import { buildNextStep, buildTriageMessage, buildTriagePrompt, getTopArea } from './triage_prompts';

const job = realJob as unknown as ExecutiveBriefJob;
const { snapshot, brief } = job;
if (!snapshot || !brief) throw new Error('fixture incomplete');
const snap: BriefSnapshot = snapshot;

const AREAS: Record<string, AttentionArea> = {
  threats: {
    id: 'threats',
    level: 'urgent',
    summary: '1 critical threat unaddressed',
    rule: 'rule',
    evidence: ['STORY-1'],
  },
  response: {
    id: 'response',
    level: 'action',
    summary: '9 high/critical alerts have no case',
    rule: 'rule',
    evidence: ['GAP-B17'],
  },
  coverage: {
    id: 'coverage',
    level: 'action',
    summary: 'Lateral Movement: 1 of 2 rules not working',
    rule: 'rule',
    evidence: ['TAC-TA0008'],
  },
  visibility: {
    id: 'visibility',
    level: 'watch',
    summary: 'ML off · 173 identities unresolved',
    rule: 'rule',
    evidence: ['GAP-B12', 'GAP-B5'],
  },
};

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const EUID = /\b(host|user|service):[^\s,)]+/;

describe('buildTriagePrompt', () => {
  it('threats: names the storyline, entities, rules, tactics and timeline', () => {
    const { title, prompt, attachmentMarkdown } = buildTriagePrompt(AREAS.threats, snap, brief);
    expect(title).toMatch(/^Triage priority threat 1: .+/);
    expect(prompt).toContain('verify');
    expect(prompt).toContain('whether a case should be opened and who should own it');
    expect(attachmentMarkdown).toContain('Severity: critical');
    expect(attachmentMarkdown).toContain('Response: unaddressed; alerts open 12');
    expect(attachmentMarkdown).toContain('a.rodriguez (user, criticality high impact, privileged');
    expect(attachmentMarkdown).toContain('docker-host-prod-01 (host, criticality extreme impact');
    expect(attachmentMarkdown).toContain('Initial Access (TA0001) → Execution (TA0002)');
    expect(attachmentMarkdown).toContain(
      'Potential Credential Access via LSASS Memory Dump (RULE-4'
    );
    expect(attachmentMarkdown).toContain('First Initial Access alert');
    expect(attachmentMarkdown).toContain('New relationship: a.rodriguez logged on to (rarely)');
    expect(attachmentMarkdown).toContain(
      'Time range: 2026-10-01T22:21:51Z to 2026-10-08T22:21:51Z'
    );
    expect(attachmentMarkdown).toContain('Brief generated at: 2026-10-08T22:21:51Z');
  });

  it('threats: falls back to seed titles without the brief', () => {
    expect(buildTriagePrompt(AREAS.threats, snap).title).not.toContain('undefined');
  });

  it('response: lists the uncovered alerts and asks about grouping and ownership', () => {
    const { prompt, attachmentMarkdown } = buildTriagePrompt(AREAS.response, snap, brief);
    expect(prompt).toContain('which alerts need a case');
    expect(prompt).toContain('how to group them');
    expect(prompt).toContain('who should own');
    expect(attachmentMarkdown).toContain('9 open High/Critical alerts in storylines have no case');
    expect(attachmentMarkdown).toContain('Threat 1');
    expect(attachmentMarkdown).toContain('12 open alerts');
    expect(attachmentMarkdown).toContain('Time range:');
  });

  it('coverage: reports enabled vs working rules and observed activity', () => {
    const { title, prompt, attachmentMarkdown } = buildTriagePrompt(AREAS.coverage, snap, brief);
    expect(title).toBe('Triage detection coverage: Lateral Movement');
    expect(prompt).toContain('rules to enable');
    expect(prompt).toContain('integrations to install');
    expect(attachmentMarkdown).toContain('Lateral Movement (TA0008): 1 of 2 enabled rules working');
    expect(attachmentMarkdown).toContain('1 not working');
    expect(attachmentMarkdown).toContain('Observed: 4 alerts');
  });

  it('visibility: lists the referenced gaps only', () => {
    const { prompt, attachmentMarkdown } = buildTriagePrompt(AREAS.visibility, snap, brief);
    expect(prompt).toContain('prioritise the fixes');
    expect(attachmentMarkdown).toContain('No security ML jobs are running (GAP-B12');
    expect(attachmentMarkdown).toContain('173 local user accounts are not resolved');
    expect(attachmentMarkdown).not.toContain('GAP-B6');
  });

  it.each(Object.keys(AREAS))('%s: never leaks internal ids', (id) => {
    const { title, prompt, attachmentMarkdown } = buildTriagePrompt(AREAS[id], snap, brief);
    const text = [title, prompt, attachmentMarkdown].join('\n');
    expect(text).not.toMatch(UUID);
    expect(text).not.toMatch(EUID);
  });

  it('is deterministic', () => {
    expect(buildTriagePrompt(AREAS.threats, snap, brief)).toEqual(
      buildTriagePrompt(AREAS.threats, snap, brief)
    );
  });

  it('joins prompt and evidence into one message', () => {
    const built = buildTriagePrompt(AREAS.visibility, snap, brief);
    expect(buildTriageMessage(built)).toBe(`${built.prompt}\n\n---\n\n${built.attachmentMarkdown}`);
  });
});

describe('buildNextStep / getTopArea', () => {
  it('derives a short next step per area', () => {
    expect(buildNextStep(AREAS.threats, snap)).toBe('Triage Threat 1 and decide on ownership');
    expect(buildNextStep(AREAS.response, snap)).toBe('Assign the 9 unowned high/critical alerts');
    expect(buildNextStep(AREAS.coverage, snap)).toBe('Review Lateral Movement detection');
    expect(buildNextStep(AREAS.visibility, snap)).toBe('Close the visibility gaps');
  });

  it('picks the most severe area, ties broken by display order', () => {
    expect(
      getTopArea({ level: 'action', areas: [AREAS.coverage, AREAS.response, AREAS.visibility] })?.id
    ).toBe('response');
    expect(getTopArea({ level: 'urgent', areas: Object.values(AREAS) })?.id).toBe('threats');
  });
});
