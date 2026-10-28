/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FP_DECISIONS_MAX_PER_APPROVAL,
  FP_DECISION_MIN_ALERTS,
  FP_DECISION_TTL_MS,
  FP_DO_NOT_PROPOSE_TTL_MS,
  buildDecisionDocument,
  decisionId,
  groupByStrictKey,
  hashCandidates,
  matchDecisions,
  readActiveDecision,
  selectDecisionKeys,
  type StrictKeyGroup,
} from './fp_decisions';

const NOW = new Date('2026-10-27T12:00:00.000Z');

const processDoc = (executable: string, overrides: Record<string, unknown> = {}) => ({
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.name': 'Rule One',
  'kibana.alert.rule.revision': 3,
  host: { os: { type: 'windows' } },
  process: { executable, code_signature: { subject_name: 'Acme' } },
  ...overrides,
});

const cloudDoc = { 'kibana.alert.rule.uuid': 'cloud-rule', user: { name: 'someone' } };

const group = (executable: string, count: number): StrictKeyGroup => {
  const { groups } = groupByStrictKey({
    alerts: Array.from({ length: count }, (_, index) => ({
      id: `${executable}-${index}`,
      doc: processDoc(executable),
    })),
    spaceId: 'default',
  });
  return groups[0];
};

describe('groupByStrictKey', () => {
  it('groups the alerts of one exact pattern, biggest first', () => {
    const { groups } = groupByStrictKey({
      alerts: [
        { id: 'a', doc: processDoc('C:\\Tools\\one.exe') },
        { id: 'b', doc: processDoc('C:\\Tools\\two.exe') },
        { id: 'c', doc: processDoc('C:\\Tools\\two.exe') },
      ],
      spaceId: 'default',
    });

    expect(groups.map(({ alertIds }) => alertIds)).toEqual([['b', 'c'], ['a']]);
  });

  // The wide key would put both in one folder. A decision must never use it.
  it('keeps two executables in the same folder apart', () => {
    const { groups } = groupByStrictKey({
      alerts: [
        { id: 'a', doc: processDoc('C:\\Tools\\one.exe') },
        { id: 'b', doc: processDoc('C:\\Tools\\two.exe') },
      ],
      spaceId: 'default',
    });

    expect(groups).toHaveLength(2);
  });

  it('leaves out alerts with no strict key and counts them', () => {
    const { groups, alertsWithoutStrictKey } = groupByStrictKey({
      alerts: [
        { id: 'a', doc: cloudDoc },
        { id: 'b', doc: processDoc('C:\\Tools\\one.exe') },
      ],
      spaceId: 'default',
    });

    expect(groups).toHaveLength(1);
    expect(alertsWithoutStrictKey).toBe(1);
  });

  it('gives the same pattern in another space another hash', () => {
    const hashIn = (spaceId: string) =>
      groupByStrictKey({ alerts: [{ id: 'a', doc: processDoc('C:\\x.exe') }], spaceId }).groups[0]
        .hash;

    expect(hashIn('default')).not.toBe(hashIn('other'));
  });
});

describe('selectDecisionKeys', () => {
  it('stores an approved key only when enough approved alerts have it', () => {
    const groups = [
      group('a.exe', FP_DECISION_MIN_ALERTS),
      group('b.exe', FP_DECISION_MIN_ALERTS - 1),
    ];

    const { selected, keysBelowMinimum } = selectDecisionKeys({
      kind: 'false_positive',
      groups,
      blocked: new Set(),
    });

    expect(selected.map(({ hash }) => hash)).toEqual([groups[0].hash]);
    expect(keysBelowMinimum).toBe(1);
  });

  it('does not store a key that has an earlier true positive or inconclusive verdict', () => {
    const groups = [group('a.exe', 5), group('b.exe', 5)];

    const { selected, keysWithOtherVerdicts } = selectDecisionKeys({
      kind: 'false_positive',
      groups,
      blocked: new Set([groups[0].hash]),
    });

    expect(selected.map(({ hash }) => hash)).toEqual([groups[1].hash]);
    expect(keysWithOtherVerdicts).toBe(1);
  });

  it('stops at the per-approval cap, biggest keys first', () => {
    const groups = Array.from({ length: FP_DECISIONS_MAX_PER_APPROVAL + 3 }, (_, index) =>
      group(`tool${index}.exe`, 10 - Math.min(index, 5))
    ).sort((a, b) => b.alertIds.length - a.alertIds.length);

    const { selected, keysOverCap } = selectDecisionKeys({
      kind: 'false_positive',
      groups,
      blocked: new Set(),
    });

    expect(selected).toHaveLength(FP_DECISIONS_MAX_PER_APPROVAL);
    expect(selected).toEqual(groups.slice(0, FP_DECISIONS_MAX_PER_APPROVAL));
    expect(keysOverCap).toBe(3);
  });

  it('stores every dismissed key, whatever its size or history', () => {
    const groups = [group('a.exe', 1), group('b.exe', 1)];

    const { selected } = selectDecisionKeys({
      kind: 'do_not_propose',
      groups,
      blocked: new Set([groups[0].hash]),
    });

    expect(selected).toHaveLength(2);
  });
});

describe('buildDecisionDocument', () => {
  const provenance = {
    spaceId: 'default',
    proposalId: 'proposal-1',
    investigationId: 'conversation-1',
    approver: 'analyst',
    now: NOW,
  };

  it('names the exact condition, the rule and revision, and who approved it', () => {
    const doc = buildDecisionDocument({
      kind: 'false_positive',
      group: group('C:\\Tools\\A.EXE', 4),
      provenance,
    }) as { attributes: Record<string, unknown>; type: string; id: string };

    expect(doc.type).toBe('security.fp_decision');
    expect(doc.id).toBe(decisionId('false_positive', String(doc.attributes.key_hash)));
    expect(doc.attributes).toEqual(
      expect.objectContaining({
        decision: 'false_positive',
        space_id: 'default',
        rule_id: 'rule-1',
        rule_revision: 3,
        rule_name: 'Rule One',
        condition_kind: 'process',
        condition: [
          'process.code_signature.subject_name=Acme',
          'process.executable=c:\\tools\\a.exe',
        ],
        alert_count: 4,
        approver: 'analyst',
        proposal_id: 'proposal-1',
        investigation_id: 'conversation-1',
        approved_via: 'group',
      })
    );
  });

  it('expires an approval after 30 days and a dismissal after 7', () => {
    const expiry = (kind: 'false_positive' | 'do_not_propose') =>
      Date.parse(
        (
          buildDecisionDocument({ kind, group: group('a.exe', 3), provenance }) as {
            expires_at: string;
          }
        ).expires_at
      ) - NOW.getTime();

    expect(expiry('false_positive')).toBe(FP_DECISION_TTL_MS);
    expect(expiry('do_not_propose')).toBe(FP_DO_NOT_PROPOSE_TTL_MS);
  });

  it('gives an approval and a dismissal of one pattern different ids', () => {
    const { hash } = group('a.exe', 3);

    expect(decisionId('false_positive', hash)).not.toBe(decisionId('do_not_propose', hash));
  });

  it('gives the same pattern the same id every time, so a re-approval overwrites', () => {
    expect(decisionId('false_positive', group('a.exe', 3).hash)).toBe(
      decisionId('false_positive', group('a.exe', 5).hash)
    );
  });

  it('omits the approver when nobody is named', () => {
    const doc = buildDecisionDocument({
      kind: 'false_positive',
      group: group('a.exe', 3),
      provenance: { ...provenance, approver: undefined },
    }) as { attributes: Record<string, unknown> };

    expect(doc.attributes).not.toHaveProperty('approver');
  });
});

describe('readActiveDecision', () => {
  const now = Date.parse('2026-10-27T12:00:00.000Z');
  const source = (overrides: Record<string, unknown> = {}) => ({
    type: 'security.fp_decision',
    expires_at: '2026-11-01T00:00:00.000Z',
    attributes: { decision: 'false_positive' },
    ...overrides,
  });

  it('reads a decision that has not expired', () => {
    expect(readActiveDecision({ id: 'd', source: source(), now })).toEqual({
      id: 'd',
      kind: 'false_positive',
    });
  });

  it('ignores an expired decision', () => {
    expect(
      readActiveDecision({
        id: 'd',
        source: source({ expires_at: '2026-10-27T11:59:59.000Z' }),
        now,
      })
    ).toBeUndefined();
  });

  it('ignores a decision with no expiry, which is not one of ours', () => {
    expect(
      readActiveDecision({ id: 'd', source: source({ expires_at: undefined }), now })
    ).toBeUndefined();
  });

  it('ignores a decision that was revoked', () => {
    expect(
      readActiveDecision({
        id: 'd',
        source: source({ governance: { lifecycle: { status: 'deleted' } } }),
        now,
      })
    ).toBeUndefined();
  });

  it('ignores another type of item and a missing document', () => {
    expect(
      readActiveDecision({ id: 'd', source: source({ type: 'security.coverage' }), now })
    ).toBe(undefined);
    expect(readActiveDecision({ id: 'd', source: undefined, now })).toBeUndefined();
  });
});

describe('matchDecisions', () => {
  const candidate = (id: string, executable: string, severity?: string) => ({
    id,
    doc: processDoc(executable),
    ...(severity ? { severity } : {}),
  });
  const hashOf = (executable: string) => group(executable, 1).hash;
  const run = ({
    candidates,
    decisions,
  }: {
    candidates: ReturnType<typeof candidate>[];
    decisions: Array<[string, Array<{ id: string; kind: 'false_positive' | 'do_not_propose' }>]>;
  }) =>
    matchDecisions({
      candidates,
      hashes: hashCandidates(candidates, 'default'),
      decisionsByHash: new Map(decisions.map(([executable, found]) => [hashOf(executable), found])),
      severities: ['low', 'medium'],
    });

  it('matches only the alerts with the exact pattern of the decision', () => {
    const { wouldClose } = run({
      candidates: [
        candidate('a', 'C:\\Tools\\one.exe', 'low'),
        candidate('b', 'C:\\Tools\\two.exe', 'low'),
      ],
      decisions: [['C:\\Tools\\one.exe', [{ id: 'd1', kind: 'false_positive' }]]],
    });

    expect(wouldClose).toEqual(new Map([['d1', ['a']]]));
  });

  it('does not match an alert of another rule revision', () => {
    const decision = [{ id: 'd1', kind: 'false_positive' as const }];
    const next = { id: 'a', doc: processDoc('C:\\x.exe', { 'kibana.alert.rule.revision': 4 }) };

    const { wouldClose } = matchDecisions({
      candidates: [next],
      hashes: hashCandidates([next], 'default'),
      decisionsByHash: new Map([[hashOf('C:\\x.exe'), decision]]),
      severities: ['low'],
    });

    expect(wouldClose.size).toBe(0);
  });

  it('keeps high and critical alerts with a human and counts them', () => {
    const { wouldClose, excludedBySeverity } = run({
      candidates: [
        candidate('a', 'C:\\x.exe', 'high'),
        candidate('b', 'C:\\x.exe', 'critical'),
        candidate('c', 'C:\\x.exe', 'medium'),
      ],
      decisions: [['C:\\x.exe', [{ id: 'd1', kind: 'false_positive' }]]],
    });

    expect(wouldClose).toEqual(new Map([['d1', ['c']]]));
    expect(excludedBySeverity).toBe(2);
  });

  it('keeps an alert with no known severity with a human, as closing needs one to vouch for', () => {
    const { wouldClose, excludedBySeverity } = run({
      candidates: [candidate('a', 'C:\\x.exe')],
      decisions: [['C:\\x.exe', [{ id: 'd1', kind: 'false_positive' }]]],
    });

    expect(wouldClose.size).toBe(0);
    expect(excludedBySeverity).toBe(1);
  });

  it('lets a dismissal win over an approval of the same pattern', () => {
    const { wouldClose, wouldSkip } = run({
      candidates: [candidate('a', 'C:\\x.exe', 'low')],
      decisions: [
        [
          'C:\\x.exe',
          [
            { id: 'approved', kind: 'false_positive' },
            { id: 'dismissed', kind: 'do_not_propose' },
          ],
        ],
      ],
    });

    expect(wouldClose.size).toBe(0);
    expect(wouldSkip).toEqual(new Map([['dismissed', ['a']]]));
  });

  it('skips alerts with no strict key, which no decision can match', () => {
    const cloud = { id: 'a', doc: { 'kibana.alert.rule.uuid': 'cloud', user: { name: 'u' } } };

    const { wouldClose } = matchDecisions({
      candidates: [cloud],
      hashes: hashCandidates([cloud], 'default'),
      decisionsByHash: new Map(),
      severities: ['low'],
    });

    expect(wouldClose.size).toBe(0);
  });
});
