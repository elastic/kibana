/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterManager } from '@kbn/data-plugin/public';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_STACK_BY_FIELD } from '..';
import { AlertSelection } from '../alert_selection';
import { useKibana } from '../../../../common/lib/kibana';
import { convertToBuildEsQuery } from '../../../../common/lib/kuery';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { parseFilterQuery } from '../parse_filter_query';
import type { SettingsOverrideOptions } from '../../results/history/types';
import * as i18n from './translations';
import type { AlertsSelectionSettings } from '../types';

export interface UseSettingsView {
  settingsView: React.ReactNode;
  actionButtons: React.ReactNode;
}

interface Props {
  connectorId: string | undefined;
  onConnectorIdSelected: (connectorId: string) => void;
  onGenerate?: (overrideOptions?: SettingsOverrideOptions) => Promise<void>;
  onSettingsChanged?: (settings: AlertsSelectionSettings) => void;
  onSettingsReset?: () => void;
  onSettingsSave?: () => void;
  settings: AlertsSelectionSettings;
  showConnectorSelector: boolean;
}

export const useSettingsView = ({
  connectorId,
  onConnectorIdSelected,
  onGenerate,
  onSettingsReset,
  onSettingsSave,
  onSettingsChanged,
  settings,
  showConnectorSelector,
}: Props): UseSettingsView => {
  const { euiTheme } = useEuiTheme();
  const { uiSettings } = useKibana().services;
  const filterManager = useRef<FilterManager>(new FilterManager(uiSettings));
  const { dataView } = useDataView();

  const [alertSummaryStackBy0, setAlertSummaryStackBy0] = useState<string>(DEFAULT_STACK_BY_FIELD);

  const [alertsPreviewStackBy0, setAlertsPreviewStackBy0] =
    useState<string>(DEFAULT_STACK_BY_FIELD);
  const [localConnectorId, setLocalConnectorId] = useState<string | undefined>(connectorId);

  // Sync local connector ID with prop changes
  useEffect(() => {
    setLocalConnectorId(connectorId);
  }, [connectorId]);

  const handleLocalConnectorIdChange = useCallback((newConnectorId: string) => {
    setLocalConnectorId(newConnectorId);
  }, []);

  const settingsView = useMemo(
    () => (
      <AlertSelection
        alertsPreviewStackBy0={alertsPreviewStackBy0}
        alertSummaryStackBy0={alertSummaryStackBy0}
        connectorId={localConnectorId}
        filterManager={filterManager.current}
        onConnectorIdSelected={handleLocalConnectorIdChange}
        onSettingsChanged={onSettingsChanged}
        setAlertsPreviewStackBy0={setAlertsPreviewStackBy0}
        setAlertSummaryStackBy0={setAlertSummaryStackBy0}
        settings={settings}
        showConnectorSelector={showConnectorSelector}
      />
    ),
    [
      alertSummaryStackBy0,
      alertsPreviewStackBy0,
      localConnectorId,
      handleLocalConnectorIdChange,
      onSettingsChanged,
      settings,
      showConnectorSelector,
    ]
  );

  useEffect(() => {
    let isSubscribed = true;

    // init the Filter manager with the local filters:
    filterManager.current.setFilters(settings.filters);

    // subscribe to filter updates:
    const subscription = filterManager.current.getUpdates$().subscribe({
      next: () => {
        if (isSubscribed) {
          const newFilters = filterManager.current.getFilters();

          onSettingsChanged?.({
            ...settings,
            filters: newFilters,
          });
        }
      },
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, [onSettingsChanged, settings]);

  const handleSave = useCallback(() => {
    if (localConnectorId && localConnectorId !== connectorId) {
      onConnectorIdSelected(localConnectorId);
    }
    onSettingsSave?.();
  }, [connectorId, localConnectorId, onConnectorIdSelected, onSettingsSave]);

  const onSaveAndRun = useCallback(() => {
    handleSave();

    // Convert settings to filter query for overrides
    const [filterQuery, kqlError] = convertToBuildEsQuery({
      config: getEsQueryConfig(uiSettings),
      dataView,
      queries: [settings.query],
      filters: settings.filters,
    });

    const overrideFilter = parseFilterQuery({ filterQuery, kqlError });

    // Pass the localConnectorId and settings overrides to ensure we use the selected values
    onGenerate?.({
      overrideConnectorId: localConnectorId,
      overrideEnd: settings.end,
      overrideFilter,
      overrideSize: settings.size,
      overrideStart: settings.start,
    });
  }, [
    dataView,
    handleSave,
    localConnectorId,
    onGenerate,
    settings.end,
    settings.filters,
    settings.query,
    settings.size,
    settings.start,
    uiSettings,
  ]);

  const actionButtons = useMemo(() => {
    return (
      <EuiFlexGroup
        alignItems="center"
        css={css`
          gap: 16px;
        `}
        gutterSize="none"
        responsive={false}
      >
        <EuiFlexItem
          css={css`
            margin-right: ${euiTheme.size.s};
          `}
          grow={false}
        >
          <EuiButtonEmpty data-test-subj="reset" flush="both" onClick={onSettingsReset} size="m">
            {i18n.RESET}
          </EuiButtonEmpty>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={localConnectorId == null ? i18n.SELECT_A_CONNECTOR_TO_SAVE : undefined}
            position="top"
          >
            <EuiButton
              color="primary"
              css={css`
                min-inline-size: 80px;
                width: 80px;
              `}
              data-test-subj="save"
              isDisabled={localConnectorId == null}
              onClick={handleSave}
              size="m"
            >
              {i18n.SAVE}
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={localConnectorId == null ? i18n.SELECT_A_CONNECTOR_TO_SAVE_AND_RUN : undefined}
            position="top"
          >
            <EuiButton
              data-test-subj="saveAndRun"
              isDisabled={localConnectorId == null}
              fill
              iconType="play"
              onClick={onSaveAndRun}
              size="m"
            >
              {i18n.SAVE_AND_RUN}
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [euiTheme.size.s, handleSave, localConnectorId, onSaveAndRun, onSettingsReset]);

  return { settingsView, actionButtons };
};
