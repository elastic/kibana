/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterControlConfig } from '@kbn/alerts-ui-shared';
import { formatPageFilterSearchParam } from './format_page_filter_search_param';

describe('formatPageFilterSearchParam', () => {
  it('returns the same data when all values are provided', () => {
    const filter: FilterControlConfig = {
      title: 'User',
      field_name: 'user.name',
      selected_options: ['test_user'],
      exists_selected: true,
      exclude: true,
      display_settings: { hide_action_bar: true },
    };

    expect(formatPageFilterSearchParam([filter])).toEqual([filter]);
  });

  it('it sets default values when they are undefined', () => {
    const filter: FilterControlConfig = {
      field_name: 'user.name',
    };

    expect(formatPageFilterSearchParam([filter])).toEqual([
      {
        title: 'user.name',
        selected_options: [],
        field_name: 'user.name',
        exists_selected: false,
        exclude: false,
        display_settings: { hide_action_bar: false },
      },
    ]);
  });
});
