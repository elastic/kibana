/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseSecurityEvents } from './setup_security_story';
import { buildGeneratedEntityStory } from './security_story';
import { buildSecurityDetectionRules, SECURITY_STORY_MAPPING } from './security_detection_rules';

const events = buildGeneratedEntityStory({
  spaceId: 'default',
  scenarioId: 'exercise-1',
  startedAt: '2026-10-13T12:00:00.000Z',
  user: { id: 'generated:alex', name: 'alex', entityId: 'user:alex@host1@local' },
  host: { id: 'host1', name: 'laptop', entityId: 'host:host1' },
});
const ndjson = events.map((event) => JSON.stringify(event)).join('\n');

describe('security story setup', () => {
  it('preserves bounded structured evidence and exact entity identifiers', () => {
    expect(parseSecurityEvents(ndjson, 'default')).toEqual(events);
  });
  it('rejects another space instead of relabeling events', () => {
    expect(() => parseSecurityEvents(ndjson, 'other')).toThrow('target space');
  });
  it.each(['', 'invalid JSON', '{}', `${ndjson}\n${JSON.stringify(events[0])}`])(
    'rejects malformed or duplicate input',
    (input) => {
      expect(() => parseSecurityEvents(input, 'default')).toThrow();
    }
  );
  it('rejects unprojected private content', () => {
    expect(() =>
      parseSecurityEvents(JSON.stringify({ ...events[0], command: 'private content' }), 'default')
    ).toThrow('invalid record');
  });
  it('bounds both the file and record counts', () => {
    expect(() => parseSecurityEvents('a'.repeat(1024 * 1024 + 1), 'default')).toThrow('1 MiB');
    expect(() =>
      parseSecurityEvents(Array(101).fill(JSON.stringify(events[0])).join('\n'), 'default')
    ).toThrow('100');
  });
  it('rejects contradictory agent/session metadata', () => {
    const event = {
      ...events[0],
      agent: { id: 'codex-1', name: 'Codex', type: 'codex' },
      session: { id: 'one' },
      entity_intelligence: {
        ...events[0].entity_intelligence,
        agent: { id: 'codex-1', name: 'Codex', provider: 'codex', session_id: 'two' },
      },
    };
    expect(() => parseSecurityEvents(JSON.stringify(event), 'default')).toThrow(
      'identities must agree'
    );
  });
  it('rejects unpaired agent metadata', () => {
    expect(() =>
      parseSecurityEvents(
        JSON.stringify({ ...events[0], agent: { id: 'codex-1', name: 'Codex', type: 'codex' } }),
        'default'
      )
    ).toThrow('identities must agree');
  });
  it('rejects a session without an agent', () => {
    expect(() =>
      parseSecurityEvents(JSON.stringify({ ...events[0], session: { id: 'unpaired' } }), 'default')
    ).toThrow('identities must agree');
  });
  it('rejects conflicting controlled and generated provenance', () => {
    expect(() =>
      parseSecurityEvents(
        JSON.stringify({
          ...events[0],
          entity_intelligence: {
            ...events[0].entity_intelligence,
            actor_provenance: 'local_os_account',
          },
        }),
        'default'
      )
    ).toThrow('provenance must agree');
  });
  it('requires an explicit denied and blocked control for prevention rules', () => {
    const rules = buildSecurityDetectionRules('default');
    for (const rule of rules.filter(({ rule_id: id }) => id.includes('-blocked-'))) {
      expect(rule.query).toContain('control.decision: "deny"');
      expect(rule.query).toContain('control.mode: "enforce"');
      expect(rule.query).toContain('control.outcome: "blocked"');
      expect(rule.query).not.toContain('event.outcome');
    }
  });
  it('permits observed violations in monitor mode but requires an allowed outcome', () => {
    const rule = buildSecurityDetectionRules('default').find(({ rule_id: id }) =>
      id.includes('export-allowed')
    );
    expect(rule?.query).toContain('control.decision: "deny"');
    expect(rule?.query).toContain('control.outcome: "allowed"');
    expect(rule?.query).not.toContain('control.mode');
  });
  it('scopes all real query rules to an exact space index without outbound actions', () => {
    const rules = buildSecurityDetectionRules('another-space');
    expect(new Set(rules.map((rule) => rule.rule_id)).size).toBe(5);
    for (const rule of rules) {
      expect(rule.index).toEqual(['logs-entity_intelligence.security-another-space']);
      expect(rule.query).toContain('kibana.space_id: "another-space"');
      expect(rule.type).toBe('query');
      expect(rule.actions).toEqual([]);
    }
    expect(() => buildSecurityDetectionRules('bad" or *')).toThrow('Invalid space ID');
  });
  it('keeps the policy reason out of full-text search and mappings strict', () => {
    expect(SECURITY_STORY_MAPPING.dynamic).toBe('strict');
    expect(JSON.stringify(SECURITY_STORY_MAPPING)).toContain(
      '"reason":{"type":"text","index":false}'
    );
  });
});
