/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterControlConfig } from '@kbn/alerts-ui-shared';

export const formatPageFilterSearchParam = (filters: FilterControlConfig[]) => {
  return filters.map(
    ({
      title,
      field_name,
      selected_options = [],
      exists_selected = false,
      exclude = false,
      display_settings = { hide_action_bar: false },
    }) => ({
      title: title ?? field_name,
      selected_options,
      field_name,
      exists_selected,
      exclude,
      display_settings: { hide_action_bar: display_settings.hide_action_bar },
    })
  );
};
