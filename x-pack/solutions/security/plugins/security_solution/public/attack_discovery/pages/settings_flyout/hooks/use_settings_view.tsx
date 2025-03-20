/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FilterManager } from '@kbn/data-plugin/public';
import { DEFAULT_END, DEFAULT_START } from '@kbn/elastic-assistant-common';
import type { Filter, Query } from '@kbn/es-query';
import { DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS } from '@kbn/elastic-assistant';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useKibana } from '../../../../common/lib/kibana';
import { AlertSelection } from '../alert_selection';
import { DEFAULT_STACK_BY_FIELD } from '..';
import { getDefaultQuery } from '../../helpers';
import { getMaxAlerts } from '../alert_selection/helpers/get_max_alerts';

import * as i18n from './translations';
import type { FilterSettings } from '../types';

export interface UseSettingsView {
  settingsView: React.ReactNode;
  actionButtons: React.ReactNode;
}

interface Props {
  filterSettings: FilterSettings;
}

export const useSettingsView = ({ filterSettings }: Props): UseSettingsView => {
  const { euiTheme } = useEuiTheme();
  const { uiSettings } = useKibana().services;
  const filterManager = useRef<FilterManager>(new FilterManager(uiSettings));

  const {
    end,
    filters,
    setLocalStorageAttackDiscoveryMaxAlerts,
    localStorageAttackDiscoveryMaxAlerts,
    onClose,
    query,
    setEnd,
    setFilters,
    setQuery,
    setStart,
    start,
  } = filterSettings;

  const [alertSummaryStackBy0, setAlertSummaryStackBy0] = useState<string>(DEFAULT_STACK_BY_FIELD);
  const [alertsPreviewStackBy0, setAlertsPreviewStackBy0] =
    useState<string>(DEFAULT_STACK_BY_FIELD);

  // local state:
  const [localEnd, setLocalEnd] = useState<string>(end ?? DEFAULT_END);
  const [localFilters, setLocalFilters] = useState<Filter[]>(filters ?? []);
  const [localQuery, setLocalQuery] = useState<Query>(query ?? getDefaultQuery());
  const [localStart, setLocalStart] = useState<string>(start ?? DEFAULT_START);
  const [localMaxAlerts, setLocalMaxAlerts] = useState(
    localStorageAttackDiscoveryMaxAlerts ?? `${DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS}`
  );

  const onReset = useCallback(() => {
    // reset local state:
    setAlertSummaryStackBy0(DEFAULT_STACK_BY_FIELD);
    setAlertsPreviewStackBy0(DEFAULT_STACK_BY_FIELD);

    setLocalEnd(DEFAULT_END);
    setLocalFilters([]);
    setLocalQuery(getDefaultQuery());
    setLocalStart(DEFAULT_START);
    setLocalMaxAlerts(`${DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS}`);
  }, []);

  const onSave = useCallback(() => {
    // copy local state:
    setEnd(localEnd);
    setFilters(localFilters);
    setQuery(localQuery);
    setStart(localStart);
    setLocalStorageAttackDiscoveryMaxAlerts(localMaxAlerts);

    onClose();
  }, [
    localEnd,
    localFilters,
    localMaxAlerts,
    localQuery,
    localStart,
    onClose,
    setEnd,
    setFilters,
    setLocalStorageAttackDiscoveryMaxAlerts,
    setQuery,
    setStart,
  ]);

  const numericMaxAlerts = useMemo(() => getMaxAlerts(localMaxAlerts), [localMaxAlerts]);

  useEffect(() => {
    let isSubscribed = true;

    // init the Filter manager with the local filters:
    filterManager.current.setFilters(localFilters);

    // subscribe to filter updates:
    const subscription = filterManager.current.getUpdates$().subscribe({
      next: () => {
        if (isSubscribed) {
          const newFilters = filterManager.current.getFilters();

          setLocalFilters(newFilters);
        }
      },
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, [localFilters]);

  const settingsView = useMemo(() => {
    return (
      <AlertSelection
        alertsPreviewStackBy0={alertsPreviewStackBy0}
        alertSummaryStackBy0={alertSummaryStackBy0}
        end={localEnd}
        filterManager={filterManager.current}
        filters={localFilters}
        maxAlerts={numericMaxAlerts}
        query={localQuery}
        setAlertsPreviewStackBy0={setAlertsPreviewStackBy0}
        setAlertSummaryStackBy0={setAlertSummaryStackBy0}
        setEnd={setLocalEnd}
        setMaxAlerts={setLocalMaxAlerts}
        setQuery={setLocalQuery}
        setStart={setLocalStart}
        start={localStart}
      />
    );
  }, [
    alertSummaryStackBy0,
    alertsPreviewStackBy0,
    localEnd,
    localFilters,
    localQuery,
    localStart,
    numericMaxAlerts,
  ]);

  const actionButtons = useMemo(() => {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem
          css={css`
            margin-right: ${euiTheme.size.s};
          `}
          grow={false}
        >
          <EuiButtonEmpty data-test-subj="reset" flush="both" onClick={onReset} size="s">
            {i18n.RESET}
          </EuiButtonEmpty>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton data-test-subj="save" fill onClick={onSave} size="s">
            {i18n.SAVE}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [euiTheme.size.s, onReset, onSave]);

  return { settingsView, actionButtons };
};
