/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS } from '@kbn/pnd-common';

import { toRequestedAlertIds } from '.';

describe('toRequestedAlertIds', () => {
  it('returns nothing for no ids', () => {
    expect(toRequestedAlertIds([])).toEqual([]);
  });

  it('keeps the ids it was given', () => {
    expect(toRequestedAlertIds(['ad-1', 'ad-2'])).toEqual(['ad-1', 'ad-2']);
  });

  /** Two proposals from one discovery are one enrichment, not two ids on the query string. */
  it('de-duplicates repeated ids', () => {
    expect(toRequestedAlertIds(['ad-1', 'ad-1', 'ad-2'])).toEqual(['ad-1', 'ad-2']);
  });

  /**
   * An uncorrelated run carries `''` — never a missing property — and has no constituent alerts to
   * aggregate, so it contributes nothing and must not become an empty query parameter.
   */
  it('drops the empty id an uncorrelated run carries', () => {
    expect(toRequestedAlertIds(['', 'ad-1'])).toEqual(['ad-1']);
  });

  it('returns nothing when every proposal is uncorrelated', () => {
    expect(toRequestedAlertIds(['', ''])).toEqual([]);
  });

  /** Sorted so the same set of proposals is the same react-query key however the queue ordered it. */
  it('sorts the ids', () => {
    expect(toRequestedAlertIds(['ad-2', 'ad-1'])).toEqual(['ad-1', 'ad-2']);
  });

  it('reads the same set in another order as the same request', () => {
    expect(toRequestedAlertIds(['ad-2', 'ad-1'])).toEqual(toRequestedAlertIds(['ad-1', 'ad-2']));
  });

  /** The route answers 400 above its cap, and the query codec cannot express the count. */
  it('caps the ids at what the route accepts', () => {
    const tooMany = new Array(PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS + 10)
      .fill(null)
      .map((_, index) => `ad-${index}`);

    expect(toRequestedAlertIds(tooMany)).toHaveLength(PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS);
  });

  it('leaves the ids it was given untouched', () => {
    const original = ['ad-2', 'ad-1'];

    toRequestedAlertIds(original);

    expect(original).toEqual(['ad-2', 'ad-1']);
  });
});
