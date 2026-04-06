/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiIcon, EuiComboBox, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { getWatchlistName } from '../../../../common/entity_analytics/watchlists/constants';
import {
  WATCHLIST_FILTER_LABEL,
  WATCHLIST_FILTER_PLACEHOLDER,
  WATCHLIST_GROUP_CUSTOM_LABEL,
  WATCHLIST_GROUP_PREBUILT_LABEL,
  WATCHLIST_ICON_GEAR_ARIA_LABEL,
  WATCHLIST_ICON_PIN_ARIA_LABEL,
} from './translations';
import type { WatchlistItem, WatchlistOption } from './types';
import { useGetWatchlists } from '../../api/hooks/use_get_watchlists';

interface WatchlistFilterProps {
  onChangeSelectedId?: (id: string | undefined) => void;
  selectedId?: string;
}

export const WatchlistFilter = ({
  onChangeSelectedId,
  selectedId: propSelectedId,
}: WatchlistFilterProps) => {
  const { data: watchlists, isLoading } = useGetWatchlists();

  const [internalSelectedId, setInternalSelectedId] = useState<string | undefined>();
  const currentSelectedId = propSelectedId !== undefined ? propSelectedId : internalSelectedId;

  const options = useMemo<WatchlistOption[]>(() => {
    if (!watchlists) return [];

    const prebuilt: WatchlistOption[] = [
      {
        prepend: (
          <EuiIcon
            type="pin"
            aria-label={WATCHLIST_ICON_PIN_ARIA_LABEL}
            style={{ marginRight: 8 }}
          />
        ),
        id: 'group-prebuilt',
        label: WATCHLIST_GROUP_PREBUILT_LABEL,
        isGroupLabelOption: true,
      },
    ];

    const custom: WatchlistOption[] = [
      {
        prepend: (
          <EuiIcon
            type="gear"
            aria-label={WATCHLIST_ICON_GEAR_ARIA_LABEL}
            style={{ marginRight: 8 }}
          />
        ),
        id: 'group-custom',
        label: WATCHLIST_GROUP_CUSTOM_LABEL,
        isGroupLabelOption: true,
      },
    ];

    watchlists.forEach((watchlist) => {
      const option: WatchlistItem = {
        id: watchlist.name, // Changed to match by name
        label: getWatchlistName(watchlist.name),
      };

      if (watchlist.managed) {
        prebuilt.push(option);
      } else {
        custom.push(option);
      }
    });

    // Only show groups if they have items
    const result: WatchlistOption[] = [];
    if (prebuilt.length > 1) result.push(...prebuilt);
    if (custom.length > 1) result.push(...custom);

    return result;
  }, [watchlists]);

  const getItemById = useCallback(
    (id?: string) =>
      options.find(
        (option): option is WatchlistItem => !option.isGroupLabelOption && option.id === id
      ) ?? null,
    [options]
  );

  const selected = useMemo(
    () => (currentSelectedId ? getItemById(currentSelectedId) : null),
    [getItemById, currentSelectedId]
  );

  const onChangeComboBox = useCallback(
    (nextOptions: EuiComboBoxOptionOption<WatchlistOption>[]) => {
      const newlySelected = nextOptions.find((o) => o && !o.isGroupLabelOption) as
        | WatchlistItem
        | undefined;

      const newId = newlySelected?.id;
      setInternalSelectedId(newId);
      onChangeSelectedId?.(newId);
    },
    [onChangeSelectedId]
  );

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" direction="row">
      <EuiFlexItem>
        <EuiComboBox
          data-test-subj="watchlistFilterComboBox"
          aria-label={WATCHLIST_FILTER_LABEL}
          prepend={WATCHLIST_FILTER_LABEL}
          placeholder={WATCHLIST_FILTER_PLACEHOLDER}
          singleSelection={{ asPlainText: true }}
          options={options}
          selectedOptions={selected ? [selected] : []}
          onChange={onChangeComboBox}
          isClearable={true}
          isLoading={isLoading}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
