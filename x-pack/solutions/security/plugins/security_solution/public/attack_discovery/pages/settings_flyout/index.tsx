/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FilterManager } from '@kbn/data-plugin/public';
import { DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS } from '@kbn/elastic-assistant';
import { DEFAULT_END, DEFAULT_START } from '@kbn/elastic-assistant-common';
import type { Filter, Query } from '@kbn/es-query';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AlertSelection } from './alert_selection';
import { getMaxAlerts } from './alert_selection/helpers/get_max_alerts';
import { useKibana } from '../../../common/lib/kibana';
import { Footer } from './footer';
import { getDefaultQuery } from '../helpers';
import * as i18n from './translations';

export const DEFAULT_STACK_BY_FIELD = 'kibana.alert.rule.name';

const MIN_WIDTH = 448; // px

interface Props {
  end: string | undefined;
  filters: Filter[] | undefined;
  localStorageAttackDiscoveryMaxAlerts: string | undefined;
  onClose: () => void;
  query: Query | undefined;
  setEnd: React.Dispatch<React.SetStateAction<string | undefined>>;
  setFilters: React.Dispatch<React.SetStateAction<Filter[] | undefined>>;
  setLocalStorageAttackDiscoveryMaxAlerts: React.Dispatch<React.SetStateAction<string | undefined>>;
  setQuery: React.Dispatch<React.SetStateAction<Query | undefined>>;
  setStart: React.Dispatch<React.SetStateAction<string | undefined>>;
  start: string | undefined;
}

const SettingsFlyoutComponent: React.FC<Props> = ({
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
}) => {
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'attackDiscoverySettingsFlyoutTitle',
  });

  const { uiSettings } = useKibana().services;
  const filterManager = useRef<FilterManager>(new FilterManager(uiSettings));

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

  return (
    <EuiFlyoutResizable
      aria-labelledby={flyoutTitleId}
      data-test-subj="settingsFlyout"
      minWidth={MIN_WIDTH}
      onClose={onClose}
      paddingSize="m"
      side="right"
      size="s"
      type="overlay"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle data-test-subj="title" size="m">
          <h2 id={flyoutTitleId}>{i18n.ATTACK_DISCOVERY_SETTINGS}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiSpacer size="s" />
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
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <Footer closeModal={onClose} onReset={onReset} onSave={onSave} />
      </EuiFlyoutFooter>
    </EuiFlyoutResizable>
  );
};

SettingsFlyoutComponent.displayName = 'SettingsFlyoutComponent';

export const SettingsFlyout = React.memo(SettingsFlyoutComponent);
