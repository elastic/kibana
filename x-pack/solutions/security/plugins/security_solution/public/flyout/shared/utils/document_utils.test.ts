/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { isAlert } from './document_utils';

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

describe('isAlert', () => {
  it('returns true when event.kind is signal', () => {
    const hit = createMockHit({ 'event.kind': 'signal' });
    expect(isAlert(hit)).toBe(true);
  });

  it('returns false when event.kind is event', () => {
    const hit = createMockHit({ 'event.kind': 'event' });
    expect(isAlert(hit)).toBe(false);
  });

  it('returns false when event.kind is missing', () => {
    const hit = createMockHit({ 'some.other.field': 'value' });
    expect(isAlert(hit)).toBe(false);
  });

  it('returns false when event.kind is not signal', () => {
    const hit = createMockHit({ 'event.kind': 'metric' });
    expect(isAlert(hit)).toBe(false);
  });

  it('returns false when event.kind is undefined', () => {
    const hit = createMockHit({});
    expect(isAlert(hit)).toBe(false);
  });
});
