/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FilterManager } from '@kbn/data-plugin/public';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import * as i18n from './translations';

import { useKibana } from '../../../../common/lib/kibana';
import { DEFAULT_STACK_BY_FIELD } from '..';
import { AlertSelection } from '../alert_selection';
import type { AlertsSelectionSettings } from '../types';

export interface UseSettingsView {
  settingsView: React.ReactNode;
  actionButtons: React.ReactNode;
}

interface Props {
  onSettingsReset?: () => void;
  onSettingsSave?: () => void;
  onSettingsChanged?: (settings: AlertsSelectionSettings) => void;
  settings: AlertsSelectionSettings;
}

export const useSettingsView = ({
  onSettingsReset,
  onSettingsSave,
  onSettingsChanged,
  settings,
}: Props): UseSettingsView => {
  const { euiTheme } = useEuiTheme();
  const { uiSettings } = useKibana().services;
  const filterManager = useRef<FilterManager>(new FilterManager(uiSettings));

  const [alertSummaryStackBy0, setAlertSummaryStackBy0] = useState<string>(DEFAULT_STACK_BY_FIELD);
  const [alertsPreviewStackBy0, setAlertsPreviewStackBy0] =
    useState<string>(DEFAULT_STACK_BY_FIELD);

  const settingsView = useMemo(() => {
    return (
      <AlertSelection
        alertsPreviewStackBy0={alertsPreviewStackBy0}
        alertSummaryStackBy0={alertSummaryStackBy0}
        filterManager={filterManager.current}
        settings={settings}
        onSettingsChanged={onSettingsChanged}
        setAlertsPreviewStackBy0={setAlertsPreviewStackBy0}
        setAlertSummaryStackBy0={setAlertSummaryStackBy0}
      />
    );
  }, [alertSummaryStackBy0, alertsPreviewStackBy0, onSettingsChanged, settings]);

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

  const actionButtons = useMemo(() => {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem
          css={css`
            margin-right: ${euiTheme.size.s};
          `}
          grow={false}
        >
          <EuiButtonEmpty data-test-subj="reset" flush="both" onClick={onSettingsReset} size="s">
            {i18n.RESET}
          </EuiButtonEmpty>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton data-test-subj="save" fill onClick={onSettingsSave} size="s">
            {i18n.SAVE}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [euiTheme.size.s, onSettingsReset, onSettingsSave]);

  return { settingsView, actionButtons };
};
