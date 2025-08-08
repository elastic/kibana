/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTab, EuiTabs, EuiText, EuiSpacer } from '@elastic/eui';
import type { FilterManager } from '@kbn/data-plugin/public';
// import type { Query } from '@kbn/es-query';
import React, { useCallback, useMemo, useState } from 'react';

import { AlertSelectionQuery } from '../alert_selection_query';
import { AlertSelectionRange } from '../alert_selection_range';
import { getMaxAlerts } from '../helpers/get_max_alerts';
import { getTabs } from '../helpers/get_tabs';
import * as i18n from '../translations';
import type { AlertsSelectionSettings } from '../../types';

interface Props {
  alertsPreviewStackBy0: string;
  alertSummaryStackBy0: string;
  filterManager: FilterManager;
  setAlertsPreviewStackBy0: React.Dispatch<React.SetStateAction<string>>;
  setAlertSummaryStackBy0: React.Dispatch<React.SetStateAction<string>>;
  onSettingsChanged?: (settings: AlertsSelectionSettings) => void;
  settings: AlertsSelectionSettings;
}

const AlertSelectionOldComponent: React.FC<Props> = ({
  alertsPreviewStackBy0,
  alertSummaryStackBy0,
  filterManager,
  setAlertsPreviewStackBy0,
  setAlertSummaryStackBy0,
  onSettingsChanged,
  settings,
}) => {
  const tabs = useMemo(
    () =>
      getTabs({
        alertsPreviewStackBy0,
        alertSummaryStackBy0,
        setAlertsPreviewStackBy0,
        setAlertSummaryStackBy0,
        settings,
      }),
    [
      alertsPreviewStackBy0,
      alertSummaryStackBy0,
      setAlertsPreviewStackBy0,
      setAlertSummaryStackBy0,
      settings,
    ]
  );

  const [selectedTabId, setSelectedTabId] = useState(tabs[0].id);

  const selectedTabContent = useMemo(
    () => tabs.find((obj) => obj.id === selectedTabId)?.content,
    [selectedTabId, tabs]
  );

  const onMaxAlertsChanged = useCallback(
    (value: string) => {
      const maxAlerts = getMaxAlerts(value);
      onSettingsChanged?.({
        ...settings,
        size: maxAlerts,
      });
    },
    [onSettingsChanged, settings]
  );

  return (
    <EuiFlexGroup data-test-subj="alertSelection" direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiText data-test-subj="customizeAlerts" size="s">
          <p>{i18n.CUSTOMIZE_THE_ALERTS}</p>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiSpacer size="m" />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <AlertSelectionQuery
          filterManager={filterManager}
          settings={settings}
          onSettingsChanged={onSettingsChanged}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiSpacer size="l" />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <AlertSelectionRange maxAlerts={settings.size} setMaxAlerts={onMaxAlertsChanged} />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiSpacer size="m" />
      </EuiFlexItem>

      <EuiTabs data-test-subj="tabs">
        {tabs.map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={tab.id === selectedTabId}
            onClick={() => setSelectedTabId(tab.id)}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      {selectedTabContent}
    </EuiFlexGroup>
  );
};

AlertSelectionOldComponent.displayName = 'AlertSelectionOldC';

export const AlertSelectionOld = React.memo(AlertSelectionOldComponent);
