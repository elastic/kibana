/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiPanel, EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo, useState } from 'react';

import { getTabs } from '../helpers/get_tabs';
import * as i18n from '../translations';
import type { AlertsSelectionSettings } from '../../types';

const ACCORDION_ID = 'previewMatchedAlertsAccordion';

interface Props {
  alertsCount?: number | null;
  alertsPreviewStackBy0: string;
  alertsPreviewTabLabel?: string;
  alertSummaryStackBy0: string;
  esqlQuery?: string;
  setAlertsPreviewStackBy0: React.Dispatch<React.SetStateAction<string>>;
  setAlertSummaryStackBy0: React.Dispatch<React.SetStateAction<string>>;
  settings: AlertsSelectionSettings;
}

const AlertPreviewTabsComponent: React.FC<Props> = ({
  alertsCount,
  alertsPreviewStackBy0,
  alertsPreviewTabLabel,
  alertSummaryStackBy0,
  esqlQuery,
  setAlertsPreviewStackBy0,
  setAlertSummaryStackBy0,
  settings,
}) => {
  const {
    euiTheme: { font },
  } = useEuiTheme();

  const tabs = useMemo(
    () =>
      getTabs({
        alertsPreviewTabLabel,
        alertsPreviewStackBy0,
        alertSummaryStackBy0,
        esqlQuery,
        setAlertsPreviewStackBy0,
        setAlertSummaryStackBy0,
        settings,
      }),
    [
      alertsPreviewTabLabel,
      alertsPreviewStackBy0,
      alertSummaryStackBy0,
      esqlQuery,
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

  const buttonContent = useMemo(
    () =>
      alertsCount != null
        ? i18n.PREVIEW_MATCHED_ALERTS(alertsCount)
        : i18n.PREVIEW_MATCHED_ALERTS_LOADING,
    [alertsCount]
  );

  return (
    <EuiPanel data-test-subj="previewMatchedAlertsPanel" hasBorder paddingSize="m">
      <EuiAccordion
        buttonContent={
          <span
            css={css`
              font-size: ${font.scale.s}${font.defaultUnits};
              font-weight: ${font.weight.medium};
            `}
          >
            {buttonContent}
          </span>
        }
        data-test-subj="previewMatchedAlertsAccordion"
        id={ACCORDION_ID}
        initialIsOpen
      >
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
      </EuiAccordion>
    </EuiPanel>
  );
};

AlertPreviewTabsComponent.displayName = 'AlertPreviewTabs';

export const AlertPreviewTabs = React.memo(AlertPreviewTabsComponent);
