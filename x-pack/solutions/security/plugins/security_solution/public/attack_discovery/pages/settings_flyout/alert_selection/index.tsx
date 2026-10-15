/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiForm, EuiFormRow, EuiTab, EuiTabs, EuiSpacer } from '@elastic/eui';
import type { FilterManager } from '@kbn/data-plugin/public';
import React, { useCallback, useMemo, useState } from 'react';

import { AlertSelectionQuery } from './alert_selection_query';
import { AlertSelectionRange } from './alert_selection_range';
import { ConnectorField } from './connector_field';
import { getMaxAlerts } from './helpers/get_max_alerts';
import { getTabs } from './helpers/get_tabs';
import * as i18n from './translations';
import type { AlertsSelectionSettings } from '../types';

interface Props {
  alertsPreviewStackBy0: string;
  alertSummaryStackBy0: string;
  connectorId?: string | undefined;
  filterManager: FilterManager;
  onSettingsChanged?: (settings: AlertsSelectionSettings) => void;
  settings: AlertsSelectionSettings;
  setAlertsPreviewStackBy0: React.Dispatch<React.SetStateAction<string>>;
  setAlertSummaryStackBy0: React.Dispatch<React.SetStateAction<string>>;
  showConnectorSelector: boolean;
  onConnectorIdSelected?: (connectorId: string) => void;
}

const AlertSelectionComponent: React.FC<Props> = ({
  alertsPreviewStackBy0,
  alertSummaryStackBy0,
  filterManager,
  onSettingsChanged,
  settings,
  setAlertsPreviewStackBy0,
  setAlertSummaryStackBy0,
  showConnectorSelector,
  connectorId,
  onConnectorIdSelected,
}) => {
  const tabs = useMemo(
    () =>
      getTabs({
        alertsPreviewStackBy0,
        alertSummaryStackBy0,
        settings,
        setAlertsPreviewStackBy0,
        setAlertSummaryStackBy0,
      }),
    [
      alertsPreviewStackBy0,
      alertSummaryStackBy0,
      settings,
      setAlertsPreviewStackBy0,
      setAlertSummaryStackBy0,
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
    <EuiForm data-test-subj="alertSelection" fullWidth>
      {showConnectorSelector && (
        <ConnectorField connectorId={connectorId} onConnectorIdSelected={onConnectorIdSelected} />
      )}

      <EuiFormRow label={i18n.CUSTOM_QUERY}>
        <AlertSelectionQuery
          filterManager={filterManager}
          settings={settings}
          onSettingsChanged={onSettingsChanged}
        />
      </EuiFormRow>

      <EuiSpacer size={'m'} />

      <EuiFormRow label={i18n.SET_NUMBER_OF_ALERTS_TO_ANALYZE}>
        <AlertSelectionRange maxAlerts={settings.size} setMaxAlerts={onMaxAlertsChanged} />
      </EuiFormRow>

      <EuiSpacer size={'m'} />

      <EuiTabs data-test-subj="tabs" size="s">
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
    </EuiForm>
  );
};

AlertSelectionComponent.displayName = 'AlertSelection';

export const AlertSelection = React.memo(AlertSelectionComponent);
