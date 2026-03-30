/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterControlConfig } from '@kbn/alerts-ui-shared';
import { DEFAULT_DSL_OPTIONS_LIST_STATE } from '@kbn/controls-constants';
import { formatPageFilterSearchParam } from './format_page_filter_search_param';

describe('formatPageFilterSearchParam', () => {
  it('returns the same data when all values are provided', () => {
    const filter = {
      title: 'User',
      field_name: 'user.name',
      selected_options: ['test_user'],
      exists_selected: true,
      exclude: true,
      display_settings: { hide_action_bar: true },
    } as FilterControlConfig;

    expect(formatPageFilterSearchParam([filter])).toEqual([filter]);
  });

  it('it sets default values when they are undefined', () => {
    const filter: FilterControlConfig = {
      field_name: 'user.name',
    };

    const { exclude, exists_selected, selected_options } = DEFAULT_DSL_OPTIONS_LIST_STATE;
    expect(formatPageFilterSearchParam([filter])).toEqual([
      {
        exclude,
        exists_selected,
        selected_options,
        title: 'user.name',
        field_name: 'user.name',
        display_settings: { hide_action_bar: false },
      },
    ]);
  });
});
