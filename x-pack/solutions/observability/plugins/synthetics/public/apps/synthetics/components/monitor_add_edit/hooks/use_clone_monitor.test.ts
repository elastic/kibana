/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsMonitorWithId } from '../../../../../../common/runtime_types';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { prepareMonitorForClone } from './use_clone_monitor';

const monitor = {
  id: 'monitor-id',
  name: 'Monitor',
  [ConfigKey.PARAMS]: '{"token":"secret"}',
} as SyntheticsMonitorWithId;

describe('prepareMonitorForClone', () => {
  it('omits parameters when the caller cannot read their values', () => {
    const result = prepareMonitorForClone(monitor, false);

    expect(result.monitor[ConfigKey.PARAMS]).toBe('');
    expect(result.paramsOmitted).toBe(true);
  });

  it('retains parameters when the caller can read their values', () => {
    const result = prepareMonitorForClone(monitor, true);

    expect(result.monitor[ConfigKey.PARAMS]).toBe('{"token":"secret"}');
    expect(result.paramsOmitted).toBe(false);
  });

  it('does not report omitted parameters when the source has none', () => {
    const result = prepareMonitorForClone({ ...monitor, [ConfigKey.PARAMS]: '' }, false);

    expect(result.paramsOmitted).toBe(false);
  });
});
