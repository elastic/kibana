/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { uniqBy } from 'lodash';
import { EuiIcon } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import type { FilterOption } from './get_filter_controls';
import { INVALID_OPTION_TOOLTIP } from './translations';

export const ALL_OPTION_KEY = '__all__';

export const getOptionLabel = (options: FilterOption[], name: string): string =>
  options.find((option) => option.name === name)?.label ?? name;

interface GetSelectableOptionsParams {
  options: FilterOption[];
  invalidOptions: string[];
  selected: string[];
  allLabel?: string;
  isLoading: boolean;
  hasError: boolean;
}

export const getSelectableOptions = ({
  options,
  invalidOptions,
  selected,
  allLabel,
  isLoading,
  hasError,
}: GetSelectableOptionsParams): EuiSelectableOption[] => {
  const allOptions = allLabel
    ? [
        {
          key: ALL_OPTION_KEY,
          label: allLabel,
          checked: selected.length === 0 ? ('on' as const) : undefined,
        },
      ]
    : [];

  const pinnedSelectedOptions = selected
    .filter((option) => isLoading || hasError || invalidOptions.includes(option))
    .map((option) => ({
      key: option,
      label: getOptionLabel(options, option),
      checked: 'on' as const,
      ...(invalidOptions.includes(option) && {
        prepend: <EuiIcon type="warning" color="warning" aria-hidden="true" />,
        toolTipContent: INVALID_OPTION_TOOLTIP,
      }),
    }));

  const validOptions = options.map(({ name, label }) => ({
    key: name,
    label,
    checked: selected.includes(name) ? ('on' as const) : undefined,
  }));

  const orderedOptions = [...allOptions, ...pinnedSelectedOptions, ...validOptions];

  return uniqBy(orderedOptions, 'key');
};
