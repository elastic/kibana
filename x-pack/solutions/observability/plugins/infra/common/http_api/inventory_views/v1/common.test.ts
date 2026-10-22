/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInventoryViewUrl, INVENTORY_VIEW_URL } from './common';

describe('getInventoryViewUrl', () => {
  it('returns the collection url when no id is provided', () => {
    expect(getInventoryViewUrl()).toBe(INVENTORY_VIEW_URL);
  });

  it('appends the id as a single path segment', () => {
    expect(getInventoryViewUrl('my-view-id')).toBe(`${INVENTORY_VIEW_URL}/my-view-id`);
  });

  it('encodes path traversal sequences so the url cannot leave the collection', () => {
    expect(getInventoryViewUrl('../../status')).toBe(`${INVENTORY_VIEW_URL}/..%2F..%2Fstatus`);
  });

  it('encodes query and fragment delimiters in the id', () => {
    expect(getInventoryViewUrl('view?foo=bar#baz')).toBe(
      `${INVENTORY_VIEW_URL}/view%3Ffoo%3Dbar%23baz`
    );
  });
});
