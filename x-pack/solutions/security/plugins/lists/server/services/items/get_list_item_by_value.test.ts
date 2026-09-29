/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { getListItemResponseMock } from '../../../common/schemas/response/list_item_schema.mock';

import { getListItemByValues } from './get_list_item_by_values';
import { getListItemByValue } from './get_list_item_by_value';
import { getListItemByValueOptionsMocks } from './get_list_item_by_value.mock';

vi.mock('./get_list_item_by_values', () => {
      const mocked = {
      getListItemByValues: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('get_list_by_value', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('Calls get_list_item_by_values with its input', async () => {
    const listItemMock = getListItemResponseMock();
    (getListItemByValues as unknown as Mock).mockResolvedValueOnce([listItemMock]);
    const options = getListItemByValueOptionsMocks();
    const listItem = await getListItemByValue(options);
    const expected = getListItemResponseMock();
    expect(listItem).toEqual([expected]);
  });
});
