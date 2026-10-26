/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlagDefinition } from '../../common/schemas/flags';
import { validatePrerequisites } from './flags_service';

type TestFlag = Pick<FlagDefinition, 'key' | 'variations' | 'environments'>;

const flag = (
  key: string,
  prerequisites: Array<{ flag: string; value: boolean }> = []
): TestFlag => ({
  key,
  variations: [true, false],
  environments: { production: { default: false, prerequisites } },
});

describe('validatePrerequisites', () => {
  it('accepts valid prerequisites', () => {
    expect(validatePrerequisites(flag('a', [{ flag: 'b', value: true }]), [flag('b')])).toEqual([]);
  });

  it('rejects missing prerequisite flags', () => {
    expect(validatePrerequisites(flag('a', [{ flag: 'b', value: true }]), [])).toEqual([
      expect.objectContaining({ path: 'environments.production.prerequisites.0.flag' }),
    ]);
  });

  it('rejects prerequisites without rules in the same environment', () => {
    const other: TestFlag = { key: 'b', variations: [true, false], environments: {} };
    expect(validatePrerequisites(flag('a', [{ flag: 'b', value: true }]), [other])).toEqual([
      expect.objectContaining({ path: 'environments.production.prerequisites.0.flag' }),
    ]);
  });

  it('rejects values that are not variations of the prerequisite', () => {
    const other: TestFlag = {
      key: 'b',
      variations: ['x', 'y'],
      environments: { production: { default: 'x' } },
    };
    expect(validatePrerequisites(flag('a', [{ flag: 'b', value: true }]), [other])).toEqual([
      expect.objectContaining({ path: 'environments.production.prerequisites.0.value' }),
    ]);
  });

  it('rejects updates that break dependent flags', () => {
    const dependent = flag('b', [{ flag: 'a', value: true }]);
    const updated: TestFlag = {
      key: 'a',
      variations: ['on', 'off'],
      environments: { production: { default: 'off' } },
    };
    expect(validatePrerequisites(updated, [dependent])).toEqual([
      expect.objectContaining({ path: 'variations' }),
    ]);
  });

  it('rejects cycles across flags', () => {
    const issues = validatePrerequisites(flag('a', [{ flag: 'b', value: true }]), [
      flag('b', [{ flag: 'c', value: true }]),
      flag('c', [{ flag: 'a', value: true }]),
    ]);
    expect(issues).toEqual([
      {
        path: 'environments.production.prerequisites',
        message: 'Prerequisites form a cycle: a -> b -> c -> a.',
      },
    ]);
  });
});
