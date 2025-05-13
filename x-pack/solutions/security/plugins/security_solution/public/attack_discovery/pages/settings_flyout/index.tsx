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
import React, { useCallback, useMemo, useState } from 'react';

import { DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS } from '@kbn/elastic-assistant';
import {
  ATTACK_DISCOVERY_SCHEDULES_ENABLED_FEATURE_FLAG,
  DEFAULT_END,
  DEFAULT_START,
} from '@kbn/elastic-assistant-common';
import type { Filter, Query } from '@kbn/es-query';

import { useKibana } from '../../../common/lib/kibana';
import { Footer } from './footer';
import * as i18n from './translations';
import { useSettingsView } from './hooks/use_settings_view';
import { useTabsView } from './hooks/use_tabs_view';
import type { AlertsSelectionSettings } from './types';
import { MIN_FLYOUT_WIDTH } from './constants';
import { getMaxAlerts } from './alert_selection/helpers/get_max_alerts';
import { getDefaultQuery } from '../helpers';

export const DEFAULT_STACK_BY_FIELD = 'kibana.alert.rule.name';

export interface Props {
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
  localStorageAttackDiscoveryMaxAlerts,
  onClose,
  query,
  setEnd,
  setFilters,
  setLocalStorageAttackDiscoveryMaxAlerts,
  setQuery,
  setStart,
  start,
}) => {
  const {
    services: { featureFlags },
  } = useKibana();

  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'attackDiscoverySettingsFlyoutTitle',
  });

  const isAttackDiscoverySchedulingEnabled = featureFlags.getBooleanValue(
    ATTACK_DISCOVERY_SCHEDULES_ENABLED_FEATURE_FLAG,
    false
  );

  const [settings, setSettings] = useState<AlertsSelectionSettings>({
    end: end ?? DEFAULT_END,
    filters: filters ?? [],
    query: query ?? getDefaultQuery(),
    size: getMaxAlerts(
      localStorageAttackDiscoveryMaxAlerts ?? `${DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS}`
    ),
    start: start ?? DEFAULT_START,
  });

  const onSettingsReset = useCallback(() => {
    // reset local state:
    setSettings({
      end: DEFAULT_END,
      filters: [],
      query: getDefaultQuery(),
      size: getMaxAlerts(`${DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS}`),
      start: DEFAULT_START,
    });
  }, []);

  const onSettingsSave = useCallback(() => {
    // copy local state:
    setEnd(settings.end);
    setFilters(settings.filters);
    setQuery(settings.query);
    setStart(settings.start);
    setLocalStorageAttackDiscoveryMaxAlerts(`${settings.size}`);

    onClose();
  }, [
    onClose,
    setEnd,
    setFilters,
    setLocalStorageAttackDiscoveryMaxAlerts,
    setQuery,
    setStart,
    settings,
  ]);

  const { settingsView, actionButtons: settingsActionButtons } = useSettingsView({
    settings,
    onSettingsReset,
    onSettingsSave,
    onSettingsChanged: setSettings,
  });

  const { tabsContainer, actionButtons: tabsActionButtons } = useTabsView({
    settings,
    onSettingsReset,
    onSettingsSave,
    onSettingsChanged: setSettings,
  });

  const content = useMemo(() => {
    if (isAttackDiscoverySchedulingEnabled) {
      return tabsContainer;
    }
    return settingsView;
  }, [isAttackDiscoverySchedulingEnabled, settingsView, tabsContainer]);

  const actionButtons = useMemo(() => {
    if (isAttackDiscoverySchedulingEnabled) {
      return tabsActionButtons;
    }
    return settingsActionButtons;
  }, [isAttackDiscoverySchedulingEnabled, settingsActionButtons, tabsActionButtons]);

  return (
    <EuiFlyoutResizable
      aria-labelledby={flyoutTitleId}
      data-test-subj="settingsFlyout"
      minWidth={MIN_FLYOUT_WIDTH}
      onClose={onClose}
      paddingSize="m"
      side="right"
      size="s"
      type="overlay"
    >
      <EuiFlyoutHeader hasBorder={!isAttackDiscoverySchedulingEnabled}>
        <EuiTitle data-test-subj="title" size="m">
          <h2 id={flyoutTitleId}>{i18n.ATTACK_DISCOVERY_SETTINGS}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiSpacer size="s" />
        {content}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <Footer closeModal={onClose} actionButtons={actionButtons} />
      </EuiFlyoutFooter>
    </EuiFlyoutResizable>
  );
};

SettingsFlyoutComponent.displayName = 'SettingsFlyoutComponent';

export const SettingsFlyout = React.memo(SettingsFlyoutComponent);
