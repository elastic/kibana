/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getResolvedFromRecordCount } from './use_resolved_from_record_count';

const target = { 'entity.id': 'user:target' };

describe('getResolvedFromRecordCount', () => {
  it('returns the group size when the open entity is the resolution target', () => {
    expect(getResolvedFromRecordCount('user:target', { target, group_size: 3 })).toBe(3);
  });

  it('returns undefined for an individual record in the group', () => {
    expect(getResolvedFromRecordCount('user:alias', { target, group_size: 3 })).toBeUndefined();
  });

  it('returns undefined when the entity is not in a resolution group', () => {
    expect(getResolvedFromRecordCount('user:target', { target, group_size: 1 })).toBeUndefined();
  });

  it('returns undefined without an entity id', () => {
    expect(getResolvedFromRecordCount(undefined, { target, group_size: 3 })).toBeUndefined();
  });
});
