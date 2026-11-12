/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ArtifactItem } from './artifact_ref';
import { toArtifactRef } from './artifact_ref';

const item = (tags: string[]): ArtifactItem =>
  ({
    id: 'id-1',
    item_id: 'item-1',
    list_id: 'endpoint_trusted_apps',
    type: 'simple',
    name: 'Chrome',
    description: 'browser',
    entries: [],
    namespace_type: 'agnostic',
    os_types: ['windows'],
    tags,
    comments: [],
    tie_breaker_id: 'tie',
    created_at: '2024-01-01T00:00:00.000Z',
    created_by: 'tester',
    updated_at: '2024-02-01T00:00:00.000Z',
    updated_by: 'tester',
    _version: 'WzEsMV0=',
  } as ArtifactItem);

describe('toArtifactRef', () => {
  it('maps policy:<id> tags to policies and keeps the ids', () => {
    const ref = toArtifactRef(item(['policy:policy-1', 'policy:policy-2', 'disabled']));
    expect(ref.policy_scope).toEqual({ kind: 'policies', policy_ids: ['policy-1', 'policy-2'] });
    expect(ref.family).toBe('trusted_apps');
    expect(ref.namespace_type).toBe('agnostic');
    expect(ref._version).toBe('WzEsMV0=');
  });

  it('maps policy:all to all and still lists any policy:<id> tags', () => {
    const ref = toArtifactRef(item(['policy:all', 'policy:policy-9']));
    expect(ref.policy_scope).toEqual({ kind: 'all', policy_ids: ['policy-9'] });
  });

  it('retains empty and repeated assignment suffixes and the first owner suffix', () => {
    const ref = toArtifactRef(
      item(['policy:', 'policy:policy-1', 'policy:policy-1', 'ownerSpaceId:', 'ownerSpaceId:other'])
    );
    expect(ref.policy_scope).toEqual({
      kind: 'policies',
      policy_ids: ['', 'policy-1', 'policy-1'],
      owner_space_id: '',
    });
  });

  it('maps a missing policy tag to unassigned', () => {
    expect(toArtifactRef(item(['disabled'])).policy_scope).toEqual({
      kind: 'unassigned',
      policy_ids: [],
    });
  });

  it('maps an ownerSpaceId tag to owner_space_id for a cross-space artifact', () => {
    const ref = toArtifactRef(item(['policy:policy-1', 'ownerSpaceId:other-space']));
    expect(ref.policy_scope).toEqual({
      kind: 'policies',
      policy_ids: ['policy-1'],
      owner_space_id: 'other-space',
    });
  });
});
