/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WATCH_AUTONOMY_LEVELS } from '@kbn/alertzero-common';
import { resolveAutonomyLevel } from './resolve_autonomy_level';

describe('resolveAutonomyLevel', () => {
  it.each(WATCH_AUTONOMY_LEVELS.map((level) => [level]))(
    'returns %s from the persisted `worker_settings` const',
    (level) => {
      const result = resolveAutonomyLevel({ worker_settings: { autonomy: level } });

      expect(result).toBe(level);
    }
  );

  it.each<[string, Record<string, unknown> | undefined]>([
    ['when the definition has no consts', undefined],
    ['when the consts carry no `worker_settings`', { other: 'value' }],
    [
      'for the unrendered template placeholder',
      { worker_settings: { autonomy: '__WORKER_AUTONOMY_LEVEL__' } },
    ],
    [
      'for a level outside the shared autonomy scale',
      { worker_settings: { autonomy: 'autonomous' } },
    ],
    ['when the autonomy value is not a string', { worker_settings: { autonomy: 1 } }],
  ])('returns undefined %s', (_scenario, consts) => {
    const result = resolveAutonomyLevel(consts);

    expect(result).toBeUndefined();
  });

  it.each([['a string'], [42], [true], [['manual']]])(
    'returns undefined when `worker_settings` is not an object (%p)',
    (workerSettings) => {
      const result = resolveAutonomyLevel({ worker_settings: workerSettings });

      expect(result).toBeUndefined();
    }
  );
});
