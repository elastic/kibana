/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { customIncompatibleAntivirusEvaluator } from './customIncompatibleAntivirusEvaluator';
import { Run, Example } from 'langsmith';

describe('customIncompatibleAntivirusEvaluator', () => {
  const baseEvent = {
    id: 'event-1',
    value: 'value-1',
    endpointId: 'endpoint-1',
  };

  const createGroup = (group: string, events = [baseEvent]) => ({
    group,
    events,
  });

  const makeExample = (insights: unknown[]): Example =>
    ({
      outputs: { insights },
    } as unknown as Example);

  const makeRun = (insights: unknown[]): Run =>
    ({
      outputs: { insights },
    } as unknown as Run);

  const evaluatorFunction = customIncompatibleAntivirusEvaluator as Function;

  it('should return score 1 when insights match', () => {
    const example = makeExample([createGroup('GroupA')]);
    const run = makeRun([createGroup('GroupA')]);

    const result = evaluatorFunction(run, example);
    expect(result).toEqual({
      key: 'correct',
      score: 1,
      comment: undefined,
    });
  });

  it('should return score 0 when number of groups mismatch', () => {
    const example = makeExample([createGroup('GroupA')]);
    const run = makeRun([createGroup('GroupA'), createGroup('GroupB')]);

    const result = evaluatorFunction(run, example);
    expect(result.score).toBe(0);
    expect(result.comment).toContain('Expected 1 insights, but got 2');
  });

  it('should return score 0 when group names mismatch', () => {
    const example = makeExample([createGroup('GroupA')]);
    const run = makeRun([createGroup('GroupB')]);

    const result = evaluatorFunction(run, example);
    expect(result.score).toBe(0);
    expect(result.comment).toContain('Mismatch in group name at index 0');
  });

  it('should return score 0 when number of events in group mismatch', () => {
    const example = makeExample([createGroup('GroupA', [baseEvent])]);
    const run = makeRun([createGroup('GroupA', [baseEvent, baseEvent])]);

    const result = evaluatorFunction(run, example);
    expect(result.score).toBe(0);
    expect(result.comment).toContain('Mismatch in number of events');
  });

  it('should return score 0 when event data mismatches', () => {
    const modifiedEvent = { ...baseEvent, value: 'wrong-value' };
    const example = makeExample([createGroup('GroupA', [baseEvent])]);
    const run = makeRun([createGroup('GroupA', [modifiedEvent])]);

    const result = evaluatorFunction(run, example);
    expect(result.score).toBe(0);
    expect(result.comment).toContain("Mismatch in event at group 'GroupA'");
  });
});
