/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiIcon, EuiComboBox, EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { parse, stringify } from 'query-string';
import { useLocation } from 'react-router-dom';

import { useNavigation } from '../../../common/lib/kibana';
import {
  ENTITY_ANALYTICS_THREAT_HUNTING_PATH,
  ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH,
} from '../../../../common/constants';
import { WATCHLIST_I18N } from './constants';
import { WatchlistItem, WatchlistOption } from './types';

interface WatchlistFilterProps {
  onChangeSelectedId?: (id: string) => void;
  defaultSelectedId?: string;
}

const WATCHLIST_QUERY_PARAM = 'watchlist_id';

// Demo atm, replacing with real data with crud
const WATCHLIST_OPTIONS: WatchlistOption[] = [
  {
    prepend: (
      <EuiIcon
        type="pin"
        aria-label={WATCHLIST_I18N.iconPin}
        style={{ marginRight: 8 }}
      />
    ),
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
      <EuiIcon
        type="gear"
        aria-label={WATCHLIST_I18N.iconGear}
        style={{ marginRight: 8 }}
      />
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

export const WatchlistFilter = ({
  onChangeSelectedId,
  defaultSelectedId,
}: WatchlistFilterProps) => {
  // hook this up to real data
  const options = WATCHLIST_OPTIONS;
  const [selected, setSelected] = useState<WatchlistItem | null>(null);

  const { search } = useLocation();

  const { navigateTo } = useNavigation();

  const selectedIdFromUrl = useMemo(() => {
    const params = parse(search);
    const value = params[WATCHLIST_QUERY_PARAM];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value ?? undefined;
  }, [search]);

  const getItemById = useCallback(
    (id?: string) =>
      options.find(
        (option): option is WatchlistItem => !option.isGroupLabelOption && option.id === id
      ) ?? null,
    [options]
  );

  const selectedFromUrl = useMemo(() => {
    if (!selectedIdFromUrl) {
      return null;
    }
    return getItemById(selectedIdFromUrl);
  }, [getItemById, selectedIdFromUrl]);

  useEffect(() => {
    setSelected(selectedFromUrl);
  }, [selectedFromUrl]);

  const navigateToWatchlist = useCallback(
    (watchlistId?: string) => {
      const isCleared = !watchlistId || watchlistId === 'none' || watchlistId === 'clear-selection';
      const nextPath = isCleared
        ? ENTITY_ANALYTICS_THREAT_HUNTING_PATH
        : ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH;
      const query = isCleared ? '' : stringify({ [WATCHLIST_QUERY_PARAM]: watchlistId });

      navigateTo({
        path: query ? `${nextPath}?${query}` : nextPath,
      });
    },
    [navigateTo]
  );

  useEffect(() => {
    if (!selectedIdFromUrl && defaultSelectedId) {
      const defaultSelection = getItemById(defaultSelectedId);
      if (defaultSelection) {
        setSelected(defaultSelection);
        navigateToWatchlist(defaultSelectedId);
      }
    }
  }, [defaultSelectedId, getItemById, selectedIdFromUrl, navigateToWatchlist]);

  const onChangeComboBox = useCallback(
    (nextOptions: EuiComboBoxOptionOption<WatchlistOption>[]) => {
      const newlySelected = nextOptions.find((o) => o && !o.isGroupLabelOption) as
        | WatchlistItem
        | undefined;

      if (newlySelected?.id) {
        onChangeSelectedId?.(newlySelected.id);
        setSelected(newlySelected);
        navigateToWatchlist(newlySelected.id);
      } else {
        setSelected(null);
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
