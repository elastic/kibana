/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';
import type { FilterManager } from '@kbn/data-plugin/public';
import React, { useCallback } from 'react';

import { AlertSelectionQuery } from '../alert_selection_query';
import { AlertSelectionRange } from '../alert_selection_range';
import { ConnectorField } from '../connector_field';
import { getMaxAlerts } from '../helpers/get_max_alerts';
import * as i18n from '../translations';
import type { AlertsSelectionSettings } from '../../types';

interface Props {
  connectorId?: string | undefined;
  filterManager: FilterManager;
  onConnectorIdSelected?: (connectorId: string) => void;
  onSettingsChanged?: (settings: AlertsSelectionSettings) => void;
  settings: AlertsSelectionSettings;
  showConnectorSelector: boolean;
}

const AlertSelectionFieldsComponent: React.FC<Props> = ({
  connectorId,
  filterManager,
  onConnectorIdSelected,
  onSettingsChanged,
  settings,
  showConnectorSelector,
}) => {
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
    <EuiForm data-test-subj="alertSelectionFields" fullWidth>
      {showConnectorSelector && (
        <ConnectorField connectorId={connectorId} onConnectorIdSelected={onConnectorIdSelected} />
      )}

      <EuiFormRow label={i18n.CUSTOM_QUERY}>
        <AlertSelectionQuery
          filterManager={filterManager}
          onSettingsChanged={onSettingsChanged}
          settings={settings}
        />
      </EuiFormRow>

      <EuiSpacer size={'m'} />

      <EuiFormRow label={i18n.SET_NUMBER_OF_ALERTS_TO_ANALYZE}>
        <AlertSelectionRange maxAlerts={settings.size} setMaxAlerts={onMaxAlertsChanged} />
      </EuiFormRow>
    </EuiForm>
  );
};

AlertSelectionFieldsComponent.displayName = 'AlertSelectionFields';

export const AlertSelectionFields = React.memo(AlertSelectionFieldsComponent);
