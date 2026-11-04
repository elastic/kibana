/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import type { Space } from '@kbn/spaces-plugin/common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { createActiveSpaceState, isObservabilityOrClassicSpace } from './space_compatibility';

const makeSpace = (solution: Space['solution']): Space =>
  ({ id: 'space-1', name: 'Space', disabledFeatures: [], solution } as unknown as Space);

describe('isObservabilityOrClassicSpace', () => {
  it('allows oblt, classic, and undefined, and rejects security and es', () => {
    expect(isObservabilityOrClassicSpace('oblt')).toBe(true);
    expect(isObservabilityOrClassicSpace('classic')).toBe(true);
    expect(isObservabilityOrClassicSpace(undefined)).toBe(true);
    expect(isObservabilityOrClassicSpace('security')).toBe(false);
    expect(isObservabilityOrClassicSpace('es')).toBe(false);
  });
});

describe('createActiveSpaceState', () => {
  it('treats missing spaces plugin as Classic', () => {
    expect(createActiveSpaceState(undefined).isCompatibleSpace()).toBe(true);
  });

  it('stays incompatible until getActiveSpace$ emits, then follows later emissions', () => {
    const activeSpace$ = new Subject<Space>();
    const spaces = {
      getActiveSpace$: () => activeSpace$.asObservable(),
    } as unknown as SpacesPluginStart;

    const state = createActiveSpaceState(spaces);
    expect(state.isCompatibleSpace()).toBe(false);

    activeSpace$.next(makeSpace('security'));
    expect(state.isCompatibleSpace()).toBe(false);

    activeSpace$.next(makeSpace('oblt'));
    expect(state.isCompatibleSpace()).toBe(true);

    activeSpace$.next(makeSpace('es'));
    expect(state.isCompatibleSpace()).toBe(false);
  });
});
