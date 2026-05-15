/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import {
  expandableFlyoutStateRightPanelOnly,
  resolveFlyoutUrlParam,
} from './expandable_flyout_url_state';

describe('expandableFlyoutStateRightPanelOnly', () => {
  it('returns right panel state with empty preview and undefined left', () => {
    const state = expandableFlyoutStateRightPanelOnly({
      id: 'test-panel',
      params: { foo: 'bar' },
    });
    expect(state).toEqual({
      right: { id: 'test-panel', params: { foo: 'bar' } },
      left: undefined,
      preview: [],
    });
  });
});

describe('resolveFlyoutUrlParam', () => {
  it('returns existing param string when set', () => {
    expect(resolveFlyoutUrlParam('(existing:!t)', { right: { id: 'x', params: {} } })).toBe(
      '(existing:!t)'
    );
  });

  it('encodes default state when current is null', () => {
    const def = { a: 1 };
    expect(resolveFlyoutUrlParam(null, def)).toBe(encode(def));
  });

  it('encodes default state when current is empty string', () => {
    const def = { right: { id: 'p', params: {} }, preview: [] };
    expect(resolveFlyoutUrlParam('', def)).toBe(encode(def));
  });
});
