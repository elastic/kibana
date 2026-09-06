/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectShard } from './select_shard';

const examples = ['a', 'b', 'c', 'd', 'e'];

describe('selectShard', () => {
  it.each([undefined, '', '   '])(
    'returns every example when the spec is unset or blank (%p)',
    (spec) => {
      expect(selectShard(examples, spec)).toEqual(examples);
    }
  );

  it('returns a copy, never the caller’s array', () => {
    const result = selectShard(examples, undefined);
    expect(result).not.toBe(examples);
  });

  it('assigns by stride so adjacent examples land on different shards', () => {
    expect(selectShard(examples, '1/2')).toEqual(['a', 'c', 'e']);
    expect(selectShard(examples, '2/2')).toEqual(['b', 'd']);
  });

  it('partitions the dataset exactly once across all shards', () => {
    const total = 3;
    const union = [1, 2, 3].flatMap((index) => selectShard(examples, `${index}/${total}`));
    expect(union.slice().sort()).toEqual(examples.slice().sort());
    expect(union).toHaveLength(examples.length);
  });

  it('tolerates more shards than examples', () => {
    expect(selectShard(['only'], '2/4')).toEqual([]);
    expect(selectShard(['only'], '1/4')).toEqual(['only']);
  });

  it('accepts surrounding whitespace around a real spec', () => {
    expect(selectShard(examples, ' 1/2 ')).toEqual(['a', 'c', 'e']);
  });

  // A silent fallback to the full dataset is the dangerous failure: every shard
  // would run every example and the sweep's doc-count gate would then see N x
  // the expected documents while reporting a complete run.
  it.each(['0/2', '3/2', '1/0', 'x/2', '1', '1/2/3', '-1/2'])(
    'throws on malformed spec %p rather than running the full dataset',
    (spec) => {
      expect(() => selectShard(examples, spec as string)).toThrow(/EVAL_SHARD/);
    }
  );

  it('does not throw for a valid single-shard spec', () => {
    expect(selectShard(examples, '1/1')).toEqual(examples);
  });
});
