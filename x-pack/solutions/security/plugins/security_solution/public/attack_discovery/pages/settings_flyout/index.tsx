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
import type { AttackDiscoveryStats } from '@kbn/elastic-assistant-common';
import type { Filter, Query } from '@kbn/es-query';

import { useKibana } from '../../../common/lib/kibana';
import { Footer } from './footer';
import * as i18n from './translations';
import { useSettingsView } from './hooks/use_settings_view';
import { useTabsView } from './hooks/use_tabs_view';
import type { AlertsSelectionSettings } from './types';
import { MIN_FLYOUT_WIDTH, SCHEDULE_TAB_ID } from './constants';
import { getMaxAlerts } from './alert_selection/helpers/get_max_alerts';
import { getDefaultQuery } from '../helpers';
import type { SettingsOverrideOptions } from '../results/history/types';
import { useKibanaFeatureFlags } from '../use_kibana_feature_flags';

export const DEFAULT_STACK_BY_FIELD = 'kibana.alert.rule.name';

export interface Props {
  connectorId: string | undefined;
  defaultSelectedTabId?: string;
  end: string | undefined;
  filters: Filter[] | undefined;
  localStorageAttackDiscoveryMaxAlerts: string | undefined;
  onClose: () => void;
  onConnectorIdSelected: (connectorId: string) => void;
  onGenerate: (overrideOptions?: SettingsOverrideOptions) => Promise<void>;
  query: Query | undefined;
  setEnd: React.Dispatch<React.SetStateAction<string | undefined>>;
  setFilters: React.Dispatch<React.SetStateAction<Filter[] | undefined>>;
  setLocalStorageAttackDiscoveryMaxAlerts: React.Dispatch<React.SetStateAction<string | undefined>>;
  setQuery: React.Dispatch<React.SetStateAction<Query | undefined>>;
  setStart: React.Dispatch<React.SetStateAction<string | undefined>>;
  start: string | undefined;
  stats: AttackDiscoveryStats | null;
}

const SettingsFlyoutComponent: React.FC<Props> = ({
  connectorId,
  defaultSelectedTabId,
  end,
  filters,
  localStorageAttackDiscoveryMaxAlerts,
  onClose,
  onConnectorIdSelected,
  onGenerate,
  query,
  setEnd,
  setFilters,
  setLocalStorageAttackDiscoveryMaxAlerts,
  setQuery,
  setStart,
  start,
  stats,
}) => {
  const {
    services: { featureFlags },
  } = useKibana();
  const { attackDiscoveryAlertsEnabled } = useKibanaFeatureFlags();

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
    connectorId,
    onConnectorIdSelected,
    onGenerate,
    onSettingsReset,
    onSettingsSave,
    onSettingsChanged: setSettings,
    settings,
    showConnectorSelector: true,
    stats,
  });

  const { tabsContainer, actionButtons: tabsActionButtons } = useTabsView({
    connectorId,
    defaultSelectedTabId,
    onConnectorIdSelected,
    onGenerate,
    onSettingsReset,
    onSettingsSave,
    onSettingsChanged: setSettings,
    settings,
    stats,
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

  const title =
    defaultSelectedTabId === SCHEDULE_TAB_ID
      ? i18n.ATTACK_DISCOVERY_SCHEDULE
      : i18n.ATTACK_DISCOVERY_SETTINGS;

  const closeButtonText = defaultSelectedTabId !== SCHEDULE_TAB_ID ? i18n.CANCEL : undefined;

  const hasBorder =
    isAttackDiscoverySchedulingEnabled || attackDiscoveryAlertsEnabled ? false : true;

  return (
    <EuiFlyoutResizable
      aria-labelledby={flyoutTitleId}
      data-test-subj="settingsFlyout"
      minWidth={MIN_FLYOUT_WIDTH}
      onClose={onClose}
      paddingSize={attackDiscoveryAlertsEnabled ? 'l' : 'm'}
      side="right"
      size={attackDiscoveryAlertsEnabled ? 'm' : 's'}
      type="overlay"
    >
      <EuiFlyoutHeader hasBorder={hasBorder}>
        <EuiTitle data-test-subj="title" size="m">
          <h2 id={flyoutTitleId}>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {attackDiscoveryAlertsEnabled ? null : <EuiSpacer size="s" />}
        {content}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <Footer
          actionButtons={actionButtons}
          closeButtonText={closeButtonText}
          closeModal={onClose}
        />
      </EuiFlyoutFooter>
    </EuiFlyoutResizable>
  );
};

SettingsFlyoutComponent.displayName = 'SettingsFlyoutComponent';

export const SettingsFlyout = React.memo(SettingsFlyoutComponent);
