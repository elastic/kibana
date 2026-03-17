/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiIcon, EuiComboBox, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useLocation } from 'react-router-dom';

import { useNavigation } from '../../../common/lib/kibana';
import { useGetWatchlists } from '../../api/hooks/use_get_watchlists';
import {
  ENTITY_ANALYTICS_THREAT_HUNTING_PATH,
  ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH,
} from '../../../../common/constants';
import {
  WATCHLIST_FILTER_LABEL,
  WATCHLIST_FILTER_PLACEHOLDER,
  WATCHLIST_GROUP_CUSTOM_LABEL,
  WATCHLIST_GROUP_PREBUILT_LABEL,
  WATCHLIST_ICON_GEAR_ARIA_LABEL,
  WATCHLIST_ICON_PIN_ARIA_LABEL,
} from './translations';
import type { WatchlistItem, WatchlistOption } from './types';

interface WatchlistFilterProps {
  onChangeSelectedId?: (id: string) => void;
}

// TODO: remove this when backend route available for mapping specific prebuilt watchlists to routes
const WATCHLIST_ROUTE_MAP: Record<string, string> = {
  'prebuilt-priv': ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH,
};

const ROUTE_TO_WATCHLIST_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(WATCHLIST_ROUTE_MAP).map(([id, path]) => [path, id])
) as Record<string, string>;

export const WatchlistFilter = ({ onChangeSelectedId }: WatchlistFilterProps) => {
  const { data: watchlists, isLoading } = useGetWatchlists();

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
        label: watchlist.name,
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

  const { pathname } = useLocation();

  const { navigateTo } = useNavigation();

  const getItemById = useCallback(
    (id?: string) =>
      options.find(
        (option): option is WatchlistItem => !option.isGroupLabelOption && option.id === id
      ) ?? null,
    [options]
  );

  const selectedIdFromRoute = useMemo(() => ROUTE_TO_WATCHLIST_MAP[pathname], [pathname]);

  const selected = useMemo(
    () => (selectedIdFromRoute ? getItemById(selectedIdFromRoute) : null),
    [getItemById, selectedIdFromRoute]
  );

  const navigateToWatchlist = useCallback(
    (watchlistId?: string) => {
      const isCleared = !watchlistId;
      const mappedPath = watchlistId ? WATCHLIST_ROUTE_MAP[watchlistId] : undefined;
      const nextPath = !isCleared && mappedPath ? mappedPath : ENTITY_ANALYTICS_THREAT_HUNTING_PATH;

      navigateTo({
        path: nextPath,
        state: { retainFilters: true }, // Add this to preserve global filters/time range on navigation
      });
    },
    [navigateTo]
  );

  const onChangeComboBox = useCallback(
    (nextOptions: EuiComboBoxOptionOption<WatchlistOption>[]) => {
      const newlySelected = nextOptions.find((o) => o && !o.isGroupLabelOption) as
        | WatchlistItem
        | undefined;

      if (newlySelected?.id) {
        onChangeSelectedId?.(newlySelected.id);

        const mappedPath = WATCHLIST_ROUTE_MAP[newlySelected.id];
        // eslint-disable-next-line no-console
        console.log(
          `[Watchlist Filter] Selected ID: "${newlySelected.id}". ` +
            `Available mappings: ${JSON.stringify(WATCHLIST_ROUTE_MAP)}. ` +
            `Would map to Privileged User Monitoring? ${
              mappedPath === ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH ? 'YES' : 'NO'
            }`
        );

        navigateToWatchlist(newlySelected.id);
      } else {
        onChangeSelectedId?.('');
        navigateToWatchlist(undefined);
      }
    },
    [onChangeSelectedId, navigateToWatchlist]
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
