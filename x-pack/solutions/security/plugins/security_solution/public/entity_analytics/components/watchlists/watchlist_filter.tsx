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
import {
  WATCHLIST_CUSTOM_C_LEVEL_USERS_LABEL,
  WATCHLIST_CUSTOM_HIGH_RISK_USERS_LABEL,
  WATCHLIST_CUSTOM_WATCHLIST_3_LABEL,
  WATCHLIST_FILTER_LABEL,
  WATCHLIST_FILTER_PLACEHOLDER,
  WATCHLIST_GROUP_CUSTOM_LABEL,
  WATCHLIST_GROUP_PREBUILT_LABEL,
  WATCHLIST_ICON_GEAR_ARIA_LABEL,
  WATCHLIST_ICON_PIN_ARIA_LABEL,
  WATCHLIST_PREBUILT_DEPARTING_EMPLOYEES_LABEL,
  WATCHLIST_PREBUILT_PRIVILEGED_USERS_LABEL,
  WATCHLIST_PREBUILT_UNAUTHORIZED_LLM_ACCESS_LABEL,
} from './translations';
import type { WatchlistItem, WatchlistOption } from './types';

interface WatchlistFilterProps {
  onChangeSelectedId?: (id: string) => void;
}

// TODO: demo purposes, replace with management API data https://github.com/elastic/security-team/issues/15463?issue=elastic%7Csecurity-team%7C15981
const WATCHLIST_OPTIONS: WatchlistOption[] = [
  {
    prepend: (
      <EuiIcon type="pin" aria-label={WATCHLIST_ICON_PIN_ARIA_LABEL} style={{ marginRight: 8 }} />
    ),
    id: 'group-prebuilt',
    label: WATCHLIST_GROUP_PREBUILT_LABEL,
    isGroupLabelOption: true,
  },
  { id: 'prebuilt-priv', label: WATCHLIST_PREBUILT_PRIVILEGED_USERS_LABEL },
  { id: 'prebuilt-llm', label: WATCHLIST_PREBUILT_UNAUTHORIZED_LLM_ACCESS_LABEL },
  { id: 'prebuilt-depart', label: WATCHLIST_PREBUILT_DEPARTING_EMPLOYEES_LABEL },

  {
    prepend: (
      <EuiIcon type="gear" aria-label={WATCHLIST_ICON_GEAR_ARIA_LABEL} style={{ marginRight: 8 }} />
    ),
    id: 'group-custom',
    label: WATCHLIST_GROUP_CUSTOM_LABEL,
    isGroupLabelOption: true,
  },
  { id: 'custom-clevel', label: WATCHLIST_CUSTOM_C_LEVEL_USERS_LABEL },
  { id: 'custom-highrisk', label: WATCHLIST_CUSTOM_HIGH_RISK_USERS_LABEL },
  { id: 'custom-3', label: WATCHLIST_CUSTOM_WATCHLIST_3_LABEL },
];

const WATCHLIST_ROUTE_MAP: Record<string, string> = {
  'prebuilt-priv': ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH,
};

const ROUTE_TO_WATCHLIST_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(WATCHLIST_ROUTE_MAP).map(([id, path]) => [path, id])
) as Record<string, string>;

export const WatchlistFilter = ({ onChangeSelectedId }: WatchlistFilterProps) => {
  // TODO: replace data with watchlist management API https://github.com/elastic/security-team/issues/15463?issue=elastic%7Csecurity-team%7C15981
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
      const isCleared = !watchlistId;
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
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
