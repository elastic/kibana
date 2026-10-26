/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SignalEntry,
  SignificantEvent,
  SignificantEventStatus,
} from '@kbn/significant-events-schema';
import { assessMembers } from '../event_members';
import {
  decideLifecycle,
  decideStatusChange,
  requestedStatus,
  StatusChange,
  type LifecycleDecision,
} from './lifecycle_controller';

const TIMESTAMP = '2026-02-01T00:00:00.000Z';

const createEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_id: 'agent-event-1',
  status: 'active',
  source_ids: ['logs.test'],
  title: 'Test event',
  summary: 'Test summary',
  severity: 'medium',
  confidence: 0.8,
  ...overrides,
});

const DEACTIVATE: StatusChange = { kind: 'operator', status: 'inactive' };

const assessment = (outcome: 'breached' | 'recovered' | 'no_data'): StatusChange => ({
  kind: 'assessment',
  outcome,
});

describe('decideStatusChange', () => {
  it('writes the next version of the event with the decided status and the new timestamp', () => {
    const latest = createEvent({ status: 'active' });

    expect(decideStatusChange({ latest, change: DEACTIVATE, timestamp: TIMESTAMP })).toEqual({
      write: true,
      event: { ...latest, '@timestamp': TIMESTAMP, status: 'inactive' },
    });
  });

  it('records the given note and keeps the stored one when it is omitted or blank', () => {
    const latest = createEvent({ assessment_note: 'Operator dismissed as noise.' });
    const noteAfter = (assessmentNote?: string) => {
      const decision = decideStatusChange({
        latest,
        change: DEACTIVATE,
        assessmentNote,
        timestamp: TIMESTAMP,
      });
      return decision.write ? decision.event.assessment_note : undefined;
    };

    expect(noteAfter('  Closed by cleanup.  ')).toBe('Closed by cleanup.');
    expect(noteAfter('   ')).toBe('Operator dismissed as noise.');
    expect(noteAfter()).toBe('Operator dismissed as noise.');
  });

  it('skips with the lifecycle reason when the status is unchanged', () => {
    expect(
      decideStatusChange({
        latest: createEvent({ status: 'inactive' }),
        change: DEACTIVATE,
        timestamp: TIMESTAMP,
      })
    ).toEqual({ write: false, status: 'inactive', reason: 'already_in_state' });
  });

  it('skips when an assessment only confirms the current status', () => {
    expect(
      decideStatusChange({
        latest: createEvent({ status: 'active' }),
        change: assessment('breached'),
        timestamp: TIMESTAMP,
      })
    ).toEqual({ write: false, status: 'active', reason: 'already_in_state' });
  });

  describe('assessment', () => {
    it.each<[string, SignificantEventStatus, 'breached' | 'recovered', SignificantEventStatus]>([
      ['starts recovery when every member is healthy', 'active', 'recovered', 'recovering'],
      ['returns a recovering event to active on a breach', 'recovering', 'breached', 'active'],
      ['reopens a closed event on a breach', 'inactive', 'breached', 'active'],
    ])('%s', (_label, current, outcome, status) => {
      const decision = decideStatusChange({
        latest: createEvent({ status: current }),
        change: assessment(outcome),
        timestamp: TIMESTAMP,
      });

      expect(decision).toMatchObject({ write: true, event: { status } });
    });

    it.each<'recovered' | 'no_data'>(['recovered', 'no_data'])(
      'skips a %s assessment of a closed event',
      (outcome) => {
        expect(
          decideStatusChange({
            latest: createEvent({ status: 'inactive' }),
            change: assessment(outcome),
            timestamp: TIMESTAMP,
          })
        ).toEqual({ write: false, status: 'inactive', reason: 'not_a_breach' });
      }
    );
  });
});

describe('requestedStatus', () => {
  it.each<[string, StatusChange, SignificantEventStatus]>([
    ['an operator deactivating', DEACTIVATE, 'inactive'],
    ['an operator activating', { kind: 'operator', status: 'active' }, 'active'],
    ['a rule that no longer exists', { kind: 'rule_deleted' }, 'inactive'],
    ['an assessment', assessment('breached'), 'active'],
  ])('is the status %s asks for', (_label, change, status) => {
    expect(requestedStatus(change)).toBe(status);
  });
});

const decide = (
  status: SignificantEventStatus | undefined,
  change: StatusChange
): LifecycleDecision => decideLifecycle({ state: { status }, change });

const ACTIVE = { write: true, status: 'active' } as const;
const RECOVERING = { write: true, status: 'recovering' } as const;
const INACTIVE = { write: true, status: 'inactive' } as const;
const NOT_A_BREACH = { write: false, reason: 'not_a_breach' } as const;
const ALREADY_IN_STATE = { write: false, reason: 'already_in_state' } as const;

describe('decideLifecycle', () => {
  describe('assessment (what discovery stored about the members)', () => {
    it.each<
      [
        string,
        SignificantEventStatus | undefined,
        'breached' | 'recovered' | 'no_data',
        LifecycleDecision
      ]
    >([
      ['opens a new series on a breach', undefined, 'breached', ACTIVE],
      ['reopens a closed series on a breach', 'inactive', 'breached', ACTIVE],
      ['keeps an active series active on a breach', 'active', 'breached', ACTIVE],
      ['returns a recovering series to active on a breach', 'recovering', 'breached', ACTIVE],
      ['starts recovery when every member is healthy', 'active', 'recovered', RECOVERING],
      ['keeps an active series active when a member cannot be judged', 'active', 'no_data', ACTIVE],
      [
        'keeps a recovering series recovering while members stay healthy',
        'recovering',
        'recovered',
        RECOVERING,
      ],
      [
        'keeps a recovering series recovering when a member cannot be judged',
        'recovering',
        'no_data',
        RECOVERING,
      ],
      [
        'does not open a series from healthy members: only evidence of an error is born',
        undefined,
        'recovered',
        NOT_A_BREACH,
      ],
      ['opens a new series active when a member cannot be judged', undefined, 'no_data', ACTIVE],
      ['does not reopen a closed series on healthy members', 'inactive', 'recovered', NOT_A_BREACH],
      ['does not reopen a closed series on unjudged members', 'inactive', 'no_data', NOT_A_BREACH],
    ])('%s', (_label, status, outcome, expected) => {
      expect(decide(status, { kind: 'assessment', outcome })).toEqual(expected);
    });
  });

  describe('operator', () => {
    it.each<SignificantEventStatus>(['active', 'recovering'])(
      'deactivates a %s series',
      (status) => {
        expect(decide(status, { kind: 'operator', status: 'inactive' })).toEqual(INACTIVE);
      }
    );

    it('does not deactivate what is already inactive', () => {
      expect(decide('inactive', { kind: 'operator', status: 'inactive' })).toEqual(
        ALREADY_IN_STATE
      );
    });

    it.each<SignificantEventStatus | undefined>(['inactive', 'recovering', undefined])(
      'activates a %s series, overriding the assessment',
      (status) => {
        expect(decide(status, { kind: 'operator', status: 'active' })).toEqual(ACTIVE);
      }
    );

    it('does not activate what is already active', () => {
      expect(decide('active', { kind: 'operator', status: 'active' })).toEqual(ALREADY_IN_STATE);
    });
  });

  describe('rule_deleted', () => {
    it.each<SignificantEventStatus>(['active', 'recovering'])('closes a %s series', (status) => {
      expect(decide(status, { kind: 'rule_deleted' })).toEqual(INACTIVE);
    });

    it('leaves an inactive series alone', () => {
      expect(decide('inactive', { kind: 'rule_deleted' })).toEqual(ALREADY_IN_STATE);
    });
  });

  describe('invariants over every state and change', () => {
    const statuses: Array<SignificantEventStatus | undefined> = [
      undefined,
      'active',
      'recovering',
      'inactive',
    ];
    const inputs: StatusChange[] = [
      { kind: 'assessment', outcome: 'breached' },
      { kind: 'assessment', outcome: 'recovered' },
      { kind: 'assessment', outcome: 'no_data' },
      { kind: 'operator', status: 'active' },
      { kind: 'operator', status: 'inactive' },
      { kind: 'rule_deleted' },
    ];
    const everyCase = statuses.flatMap((status) =>
      inputs.map((change) => ({ status, change, decision: decide(status, change) }))
    );

    it('is deterministic: the same state and change always give the same decision', () => {
      everyCase.forEach(({ status, change, decision }) => {
        expect(decide(status, change)).toEqual(decision);
      });
    });

    it('enters recovering only from an assessment of an active or new series', () => {
      everyCase.forEach(({ status, change, decision }) => {
        if (decision.write && decision.status === 'recovering' && status !== 'recovering') {
          expect(change.kind).toBe('assessment');
          expect(['active', undefined]).toContain(status);
        }
      });
    });

    it('never lets an assessment close a live series, and lets it leave recovering only back to active', () => {
      everyCase.forEach(({ status, change, decision }) => {
        if (change.kind === 'assessment' && decision.write && status !== undefined) {
          expect(decision.status).not.toBe('inactive');
          if (status === 'recovering') {
            expect(['recovering', 'active']).toContain(decision.status);
          }
        }
      });
    });

    it('never lets a non-breaching assessment reopen a closed series', () => {
      everyCase.forEach(({ status, change, decision }) => {
        if (
          change.kind === 'assessment' &&
          change.outcome !== 'breached' &&
          status === 'inactive'
        ) {
          expect(decision.write).toBe(false);
        }
      });
    });

    it('closes a live series only through an operator or a deleted rule', () => {
      everyCase.forEach(({ status, change, decision }) => {
        const wasLive = status === 'active' || status === 'recovering';
        if (wasLive && decision.write && decision.status === 'inactive') {
          expect(['operator', 'rule_deleted']).toContain(change.kind);
        }
      });
    });
  });
});

const decideFromMembers = ({
  latest,
  signals,
}: {
  latest: SignificantEvent | undefined;
  signals: SignalEntry[];
}): LifecycleDecision =>
  decideLifecycle({
    state: { status: latest?.status },
    change: StatusChange.assessed(assessMembers(signals)),
  });

const eventAt = (status: SignificantEvent['status']): SignificantEvent =>
  ({ event_id: 'e1', status } as SignificantEvent);

const signal = (rule: string, verdict: SignalEntry['verdict']): SignalEntry =>
  ({
    type: 'detection',
    source_id: 'logs',
    description: `${rule} ${verdict}`,
    verdict,
    metadata: { rule_uuid: rule, rule_name: rule },
  } as SignalEntry);

const breaching = [signal('a', 'confirms'), signal('b', 'confirms')];
const oneHealthy = [signal('a', 'refutes'), signal('b', 'confirms')];
const allHealthy = [signal('a', 'refutes'), signal('b', 'refutes')];

describe('discovery assessments: the status comes from the members, never from the agent', () => {
  it('opens a new event as active on a breach', () => {
    expect(decideFromMembers({ latest: undefined, signals: breaching })).toEqual({
      write: true,
      status: 'active',
    });
  });

  it('does not open an event from healthy members', () => {
    expect(decideFromMembers({ latest: undefined, signals: allHealthy })).toEqual({
      write: false,
      reason: 'not_a_breach',
    });
  });

  it('keeps an active event active while any member still breaches', () => {
    expect(decideFromMembers({ latest: eventAt('active'), signals: oneHealthy })).toEqual({
      write: true,
      status: 'active',
    });
  });

  it('starts recovery when every member is healthy', () => {
    expect(decideFromMembers({ latest: eventAt('active'), signals: allHealthy })).toEqual({
      write: true,
      status: 'recovering',
    });
  });

  it('returns a recovering event to active when a member breaches again', () => {
    expect(
      decideFromMembers({
        latest: eventAt('recovering'),
        signals: [signal('a', 'refutes'), signal('b', 'refutes'), signal('c', 'confirms')],
      })
    ).toEqual({ write: true, status: 'active' });
  });

  it('keeps a recovering event recovering while members stay healthy', () => {
    expect(decideFromMembers({ latest: eventAt('recovering'), signals: allHealthy })).toEqual({
      write: true,
      status: 'recovering',
    });
  });

  it('reopens a closed event on a breach, and ignores healthy members of a closed one', () => {
    expect(decideFromMembers({ latest: eventAt('inactive'), signals: breaching })).toEqual({
      write: true,
      status: 'active',
    });
    expect(decideFromMembers({ latest: eventAt('inactive'), signals: allHealthy })).toEqual({
      write: false,
      reason: 'not_a_breach',
    });
  });

  it('holds the status when a member cannot be judged', () => {
    expect(
      decideFromMembers({
        latest: eventAt('active'),
        signals: [signal('a', 'refutes'), signal('b', 'inconclusive')],
      })
    ).toEqual({ write: true, status: 'active' });
  });
});
