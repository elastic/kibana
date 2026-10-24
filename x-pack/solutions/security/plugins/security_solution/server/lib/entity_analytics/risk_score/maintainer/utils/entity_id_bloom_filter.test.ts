/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityIdBloomFilter } from './entity_id_bloom_filter';

const ids = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, i) => `${prefix}:entity-${i}@example.com`);

describe('EntityIdBloomFilter', () => {
  it('never answers no for an ID it was given', () => {
    const filter = EntityIdBloomFilter.forCount(20_000);
    const added = ids('user', 20_000);
    added.forEach((id) => filter.add(id));

    expect(added.every((id) => filter.mightContain(id))).toBe(true);
    expect(filter.count).toBe(20_000);
  });

  it('keeps false positives near the rate it was sized for', () => {
    const filter = EntityIdBloomFilter.forCount(20_000, 0.01);
    ids('user', 20_000).forEach((id) => filter.add(id));

    const falsePositives = ids('host', 50_000).filter((id) => filter.mightContain(id)).length;

    expect(falsePositives / 50_000).toBeLessThan(0.02);
  });

  it('takes about 1.4 MB per million IDs at a 1% rate', () => {
    expect(EntityIdBloomFilter.forCount(1_000_000).bytes).toBeLessThan(1.45 * 1024 * 1024);
  });

  it('answers no for everything while empty', () => {
    const filter = EntityIdBloomFilter.forCount(0);

    expect(ids('host', 100).some((id) => filter.mightContain(id))).toBe(false);
  });
});
