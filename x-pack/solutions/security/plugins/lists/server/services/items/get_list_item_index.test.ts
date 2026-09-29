/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { getListItemIndex } from './get_list_item_index';

describe('get_list_item_index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('Returns the list item index when there is a space', async () => {
    const listIndex = getListItemIndex({
      listsItemsIndexName: 'lists-items-index',
      spaceId: 'test-space',
    });
    expect(listIndex).toEqual('lists-items-index-test-space');
  });
});
