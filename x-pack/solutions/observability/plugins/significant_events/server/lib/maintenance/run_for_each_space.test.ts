/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asSpaceId } from '@kbn/core-spaces-common';
import { runForEachSpace, throwSpaceFailures } from './run_for_each_space';

const SPACE_A = asSpaceId('space-a');
const SPACE_B = asSpaceId('space-b');

describe('runForEachSpace', () => {
  it('runs every space in order and returns no failures when all succeed', async () => {
    const visited: string[] = [];

    const failures = await runForEachSpace({
      spaceIds: [SPACE_A, SPACE_B],
      run: async (spaceId) => {
        visited.push(spaceId);
      },
    });

    expect(visited).toEqual(['space-a', 'space-b']);
    expect(failures).toEqual([]);
  });

  it('keeps going after a failure and reports the failed space with its error', async () => {
    const visited: string[] = [];
    const boom = new Error('boom');

    const failures = await runForEachSpace({
      spaceIds: [SPACE_A, SPACE_B],
      run: async (spaceId) => {
        visited.push(spaceId);
        if (spaceId === SPACE_A) {
          throw boom;
        }
      },
    });

    expect(visited).toEqual(['space-a', 'space-b']);
    expect(failures).toEqual([{ spaceId: SPACE_A, error: boom }]);
  });
});

describe('throwSpaceFailures', () => {
  it('does nothing without failures', () => {
    expect(() => throwSpaceFailures({ action: 'Sweep', failures: [] })).not.toThrow();
  });

  it('names the space and keeps the original error as the cause for one failure', () => {
    const cause = new Error('so write failed');

    expect(() =>
      throwSpaceFailures({
        action: 'Sweep',
        failures: [{ spaceId: SPACE_A, error: cause }],
        hint: 'Run it again',
      })
    ).toThrow(
      expect.objectContaining({
        message: 'Sweep failed in space: "space-a" (so write failed). Run it again',
        cause,
      })
    );
  });

  it('names every space in an AggregateError for several failures', () => {
    expect(() =>
      throwSpaceFailures({
        action: 'Sweep',
        failures: [
          { spaceId: SPACE_A, error: new Error('first') },
          { spaceId: SPACE_B, error: new Error('second') },
        ],
      })
    ).toThrow(
      expect.objectContaining({
        name: 'AggregateError',
        message: 'Sweep failed in 2 spaces: "space-a" (first), "space-b" (second)',
      })
    );
  });
});
