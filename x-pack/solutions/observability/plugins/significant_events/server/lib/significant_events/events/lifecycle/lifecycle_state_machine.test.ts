/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventStatus } from '@kbn/significant-events-schema';
import {
  decideLifecycle,
  operatorInputFor,
  type LifecycleDecision,
  type LifecycleInput,
} from './lifecycle_state_machine';

const decide = (
  status: SignificantEventStatus | undefined,
  input: LifecycleInput
): LifecycleDecision => decideLifecycle({ state: { status }, input });

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
        'breaching' | 'clean' | 'no_data',
        LifecycleDecision
      ]
    >([
      ['opens a new series on a breach', undefined, 'breaching', ACTIVE],
      ['reopens a closed series on a breach', 'inactive', 'breaching', ACTIVE],
      ['keeps an active series active on a breach', 'active', 'breaching', ACTIVE],
      ['returns a recovering series to active on a breach', 'recovering', 'breaching', ACTIVE],
      ['starts recovery when every member is healthy', 'active', 'clean', RECOVERING],
      ['keeps an active series active when a member cannot be judged', 'active', 'no_data', ACTIVE],
      [
        'keeps a recovering series recovering while members stay healthy',
        'recovering',
        'clean',
        RECOVERING,
      ],
      [
        'keeps a recovering series recovering when a member cannot be judged',
        'recovering',
        'no_data',
        RECOVERING,
      ],
      ['does not open a new series on healthy members', undefined, 'clean', NOT_A_BREACH],
      ['does not open a new series on unjudged members', undefined, 'no_data', NOT_A_BREACH],
      ['does not reopen a closed series on healthy members', 'inactive', 'clean', NOT_A_BREACH],
      ['does not reopen a closed series on unjudged members', 'inactive', 'no_data', NOT_A_BREACH],
    ])('%s', (_label, status, outcome, expected) => {
      expect(decide(status, { kind: 'assessment', outcome })).toEqual(expected);
    });
  });

  describe('operator intent', () => {
    it.each<SignificantEventStatus>(['active', 'recovering'])(
      'deactivates a %s series',
      (status) => {
        expect(decide(status, { kind: 'operator', intent: 'deactivate' })).toEqual(INACTIVE);
      }
    );

    it('does not deactivate what is already inactive', () => {
      expect(decide('inactive', { kind: 'operator', intent: 'deactivate' })).toEqual(
        ALREADY_IN_STATE
      );
    });

    it.each<SignificantEventStatus | undefined>(['inactive', 'recovering', undefined])(
      'activates a %s series, overriding the assessment',
      (status) => {
        expect(decide(status, { kind: 'operator', intent: 'activate' })).toEqual(ACTIVE);
      }
    );

    it('does not activate what is already active', () => {
      expect(decide('active', { kind: 'operator', intent: 'activate' })).toEqual(ALREADY_IN_STATE);
    });

    it('maps a manual status to the intent it expresses', () => {
      expect(operatorInputFor('active')).toEqual({ kind: 'operator', intent: 'activate' });
      expect(operatorInputFor('inactive')).toEqual({ kind: 'operator', intent: 'deactivate' });
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

  describe('invariants over every state and input', () => {
    const statuses: Array<SignificantEventStatus | undefined> = [
      undefined,
      'active',
      'recovering',
      'inactive',
    ];
    const inputs: LifecycleInput[] = [
      { kind: 'assessment', outcome: 'breaching' },
      { kind: 'assessment', outcome: 'clean' },
      { kind: 'assessment', outcome: 'no_data' },
      { kind: 'operator', intent: 'activate' },
      { kind: 'operator', intent: 'deactivate' },
      { kind: 'rule_deleted' },
    ];
    const everyCase = statuses.flatMap((status) =>
      inputs.map((input) => ({ status, input, decision: decide(status, input) }))
    );

    it('is deterministic: the same state and input always give the same decision', () => {
      everyCase.forEach(({ status, input, decision }) => {
        expect(decide(status, input)).toEqual(decision);
      });
    });

    it('enters recovering only from an assessment of an active series', () => {
      everyCase.forEach(({ status, input, decision }) => {
        if (decision.write && decision.status === 'recovering' && status !== 'recovering') {
          expect(input.kind).toBe('assessment');
          expect(status).toBe('active');
        }
      });
    });

    it('never lets an assessment close a series, and lets it leave recovering only back to active', () => {
      everyCase.forEach(({ status, input, decision }) => {
        if (input.kind === 'assessment' && decision.write) {
          expect(decision.status).not.toBe('inactive');
          if (status === 'recovering') {
            expect(['recovering', 'active']).toContain(decision.status);
          }
        }
      });
    });

    it('never lets an assessment open or reopen a series unless it is breaching', () => {
      everyCase.forEach(({ status, input, decision }) => {
        const notLive = status === undefined || status === 'inactive';
        if (input.kind === 'assessment' && input.outcome !== 'breaching' && notLive) {
          expect(decision.write).toBe(false);
        }
      });
    });

    it('closes a series only through an operator or a deleted rule', () => {
      everyCase.forEach(({ input, decision }) => {
        if (decision.write && decision.status === 'inactive') {
          expect(['operator', 'rule_deleted']).toContain(input.kind);
        }
      });
    });
  });
});
