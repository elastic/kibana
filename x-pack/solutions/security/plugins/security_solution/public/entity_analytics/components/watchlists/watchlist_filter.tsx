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
import {
  ENTITY_ANALYTICS_THREAT_HUNTING_PATH,
  ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH,
} from '../../../../common/constants';
import { WATCHLIST_I18N } from './constants';
import type { WatchlistItem, WatchlistOption } from './types';

interface WatchlistFilterProps {
  onChangeSelectedId?: (id: string) => void;
}

// Demo atm, replacing with real data with crud
const WATCHLIST_OPTIONS: WatchlistOption[] = [
  {
    prepend: <EuiIcon type="pin" aria-label={WATCHLIST_I18N.iconPin} style={{ marginRight: 8 }} />,
    id: 'group-prebuilt',
    label: WATCHLIST_I18N.groupPrebuilt,
    isGroupLabelOption: true,
    groupicon: 'pin',
  },
  { id: 'prebuilt-priv', label: WATCHLIST_I18N.prebuiltPrivilegedUsers },
  { id: 'prebuilt-llm', label: WATCHLIST_I18N.prebuiltUnauthorizedLlmAccess },
  { id: 'prebuilt-depart', label: WATCHLIST_I18N.prebuiltDepartingEmployees },

  {
    prepend: (
      <EuiIcon type="gear" aria-label={WATCHLIST_I18N.iconGear} style={{ marginRight: 8 }} />
    ),
    id: 'group-custom',
    label: WATCHLIST_I18N.groupCustom,
    isGroupLabelOption: true,
    groupicon: 'gear',
  },
  { id: 'custom-clevel', label: WATCHLIST_I18N.customCLevelUsers },
  { id: 'custom-highrisk', label: WATCHLIST_I18N.customHighRiskUsers },
  { id: 'custom-3', label: WATCHLIST_I18N.customWatchlist3 },
];

const WATCHLIST_ROUTE_MAP: Record<string, string> = {
  'prebuilt-priv': ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH,
};

const ROUTE_TO_WATCHLIST_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(WATCHLIST_ROUTE_MAP).map(([id, path]) => [path, id])
) as Record<string, string>;

export const WatchlistFilter = ({ onChangeSelectedId }: WatchlistFilterProps) => {
  // hook this up to real data
  const options = WATCHLIST_OPTIONS;

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
      const isCleared = !watchlistId || watchlistId === 'none' || watchlistId === 'clear-selection';
      const mappedPath = watchlistId ? WATCHLIST_ROUTE_MAP[watchlistId] : undefined;
      const nextPath = !isCleared && mappedPath ? mappedPath : ENTITY_ANALYTICS_THREAT_HUNTING_PATH;

      navigateTo({
        path: nextPath,
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
        navigateToWatchlist(newlySelected.id);
      } else {
        navigateToWatchlist('none');
      }
    },
    [onChangeSelectedId, navigateToWatchlist]
  );

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" direction="row">
      <EuiFlexItem>
        <EuiComboBox
          data-test-subj="watchlistFilterComboBox"
          aria-label="Watchlist"
          prepend="Watchlist"
          placeholder="Select watchlist"
          singleSelection={{ asPlainText: true }}
          options={options}
          selectedOptions={selected ? [selected] : []}
          onChange={onChangeComboBox}
          isClearable={true}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
