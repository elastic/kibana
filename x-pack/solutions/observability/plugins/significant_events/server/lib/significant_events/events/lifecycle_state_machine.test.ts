/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventStatus } from '@kbn/significant-events-schema';
import {
  decideLifecycle,
  type LifecycleDecision,
  type LifecycleInput,
} from './lifecycle_state_machine';
import { RECOVERING_COUNT } from './status_transition';

const decide = (
  status: SignificantEventStatus | undefined,
  input: LifecycleInput,
  evaluations = 0
): LifecycleDecision => decideLifecycle({ state: { status, evaluations }, input });

describe('decideLifecycle', () => {
  describe('evaluation', () => {
    it.each<
      [string, SignificantEventStatus, 'breaching' | 'clean' | 'no_data', number, LifecycleDecision]
    >([
      ['active, still breaching', 'active', 'breaching', 0, { write: false, reason: 'unchanged' }],
      [
        'active, clean: enters recovering with one evaluation',
        'active',
        'clean',
        0,
        { write: true, status: 'recovering', evaluations: 1 },
      ],
      [
        'recovering, breach returns: back to active, count cleared',
        'recovering',
        'breaching',
        2,
        { write: true, status: 'active' },
      ],
      [
        'recovering, clean below N: another evaluation',
        'recovering',
        'clean',
        1,
        { write: true, status: 'recovering', evaluations: 2 },
      ],
      [
        'recovering, clean at N-1',
        'recovering',
        'clean',
        RECOVERING_COUNT - 1,
        { write: true, status: 'recovering', evaluations: RECOVERING_COUNT },
      ],
      [
        'recovering, clean at N: closes, count cleared',
        'recovering',
        'clean',
        RECOVERING_COUNT,
        { write: true, status: 'inactive' },
      ],
      [
        'active, no data: status stands',
        'active',
        'no_data',
        0,
        { write: false, reason: 'no_data' },
      ],
      [
        'recovering, no data: status and count stand',
        'recovering',
        'no_data',
        2,
        { write: false, reason: 'no_data' },
      ],
    ])('%s', (_label, status, outcome, evaluations, expected) => {
      expect(decide(status, { kind: 'evaluation', outcome }, evaluations)).toEqual(expected);
    });

    it.each<SignificantEventStatus | undefined>(['inactive', undefined])(
      'does not evaluate a series that is not live (%s)',
      (status) => {
        expect(decide(status, { kind: 'evaluation', outcome: 'clean' })).toEqual({
          write: false,
          reason: 'not_live',
        });
      }
    );
  });

  describe('breach_asserted (a discovery write)', () => {
    it.each<SignificantEventStatus | undefined>([undefined, 'inactive', 'active'])(
      'opens or continues as active from %s',
      (status) => {
        expect(decide(status, { kind: 'breach_asserted' })).toEqual({
          write: true,
          status: 'active',
        });
      }
    );

    it('carries evidence onto a recovering series without moving it or its count', () => {
      expect(decide('recovering', { kind: 'breach_asserted' }, 2)).toEqual({
        write: true,
        status: 'recovering',
        evaluations: 2,
      });
    });
  });

  describe('operator intent', () => {
    it.each<SignificantEventStatus>(['active', 'recovering'])(
      'deactivates a %s series',
      (status) => {
        expect(decide(status, { kind: 'operator', intent: 'deactivate' }, 2)).toEqual({
          write: true,
          status: 'inactive',
        });
      }
    );

    it('does not deactivate what is already inactive', () => {
      expect(decide('inactive', { kind: 'operator', intent: 'deactivate' })).toEqual({
        write: false,
        reason: 'already_in_state',
      });
    });

    it.each<SignificantEventStatus>(['inactive', 'recovering'])(
      'activates a %s series, overriding the engine',
      (status) => {
        expect(decide(status, { kind: 'operator', intent: 'activate' }, 2)).toEqual({
          write: true,
          status: 'active',
        });
      }
    );

    it('does not activate what is already active', () => {
      expect(decide('active', { kind: 'operator', intent: 'activate' })).toEqual({
        write: false,
        reason: 'already_in_state',
      });
    });
  });

  describe('rule_deleted', () => {
    it.each<SignificantEventStatus>(['active', 'recovering'])('closes a %s series', (status) => {
      expect(decide(status, { kind: 'rule_deleted' })).toEqual({ write: true, status: 'inactive' });
    });

    it('leaves an inactive series alone', () => {
      expect(decide('inactive', { kind: 'rule_deleted' })).toEqual({
        write: false,
        reason: 'already_in_state',
      });
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
      { kind: 'evaluation', outcome: 'breaching' },
      { kind: 'evaluation', outcome: 'clean' },
      { kind: 'evaluation', outcome: 'no_data' },
      { kind: 'breach_asserted' },
      { kind: 'operator', intent: 'activate' },
      { kind: 'operator', intent: 'deactivate' },
      { kind: 'rule_deleted' },
    ];
    const evaluationCounts = [0, 1, RECOVERING_COUNT - 1, RECOVERING_COUNT, RECOVERING_COUNT + 1];
    const everyCase = statuses.flatMap((status) =>
      inputs.flatMap((input) =>
        evaluationCounts.map((evaluations) => ({
          status,
          input,
          evaluations,
          decision: decide(status, input, evaluations),
        }))
      )
    );

    it('sets an evaluation count only on a recovering write', () => {
      everyCase.forEach(({ decision }) => {
        if (decision.write && decision.status !== 'recovering') {
          expect(decision.evaluations).toBeUndefined();
        }
        if (decision.write && decision.status === 'recovering') {
          expect(decision.evaluations).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('never advances the count except on an evaluation', () => {
      everyCase.forEach(({ status, input, evaluations, decision }) => {
        if (
          status === 'recovering' &&
          input.kind !== 'evaluation' &&
          decision.write &&
          decision.status === 'recovering'
        ) {
          expect(decision.evaluations).toBe(evaluations);
        }
      });
    });

    it('leaves recovering only through an evaluation, an operator or a deleted rule', () => {
      everyCase.forEach(({ status, input, decision }) => {
        if (status === 'recovering' && decision.write && decision.status !== 'recovering') {
          expect(['evaluation', 'operator', 'rule_deleted']).toContain(input.kind);
        }
      });
    });

    it('never gives an agent assertion the power to close or to start recovery', () => {
      everyCase.forEach(({ status, input, decision }) => {
        if (input.kind === 'breach_asserted' && decision.write) {
          expect(decision.status).not.toBe('inactive');
          if (status !== 'recovering') {
            expect(decision.status).toBe('active');
          }
        }
      });
    });
  });
});
