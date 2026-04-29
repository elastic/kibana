/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUpdatedSpacesSelection } from './monitor_spaces';

const ALL_SPACES_ID = 'all-spaces-id';
const CURRENT_SPACE_ID = 'current-space-id';

describe('getUpdatedSpacesSelection', () => {
  it('returns only allSpacesId if allSpacesId is selected', () => {
    expect(
      getUpdatedSpacesSelection(['foo', ALL_SPACES_ID, 'bar'], CURRENT_SPACE_ID, ALL_SPACES_ID)
    ).toEqual([ALL_SPACES_ID]);
  });

  it('returns currentSpaceId if nothing is selected', () => {
    expect(getUpdatedSpacesSelection([], CURRENT_SPACE_ID, ALL_SPACES_ID)).toEqual([
      CURRENT_SPACE_ID,
    ]);
  });

  it('adds currentSpaceId if not present', () => {
    expect(getUpdatedSpacesSelection(['foo', 'bar'], CURRENT_SPACE_ID, ALL_SPACES_ID)).toEqual([
      'foo',
      'bar',
      CURRENT_SPACE_ID,
    ]);
  });

  it('returns selectedIds if currentSpaceId is already present', () => {
    expect(
      getUpdatedSpacesSelection(['foo', CURRENT_SPACE_ID, 'bar'], CURRENT_SPACE_ID, ALL_SPACES_ID)
    ).toEqual(['foo', CURRENT_SPACE_ID, 'bar']);
  });

  it('returns selectedIds if no currentSpaceId is provided', () => {
    expect(getUpdatedSpacesSelection(['foo', 'bar'], undefined, ALL_SPACES_ID)).toEqual([
      'foo',
      'bar',
    ]);
  });

  it('returns only allSpacesId if allSpacesId is the only selection', () => {
    expect(getUpdatedSpacesSelection([ALL_SPACES_ID], CURRENT_SPACE_ID, ALL_SPACES_ID)).toEqual([
      ALL_SPACES_ID,
    ]);
  });

  it('returns empty array if nothing is selected and no currentSpaceId', () => {
    expect(getUpdatedSpacesSelection([], undefined, ALL_SPACES_ID)).toEqual([]);
  });
});
