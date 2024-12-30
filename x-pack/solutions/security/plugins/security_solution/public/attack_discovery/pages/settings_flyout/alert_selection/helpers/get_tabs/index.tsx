/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import type { Filter, Query } from '@kbn/es-query';
import React from 'react';

import { getAlertSummaryEsqlQuery } from '../../alert_summary_tab/get_alert_summary_esql_query';
import { getAlertSummaryLensAttributes } from '../../alert_summary_tab/get_alert_summary_lens_attributes';
import { getAlertsPreviewEsqlQuery } from '../../alerts_preview_tab/get_alerts_preview_esql_query';
import { getAlertsPreviewLensAttributes } from '../../alerts_preview_tab/get_alerts_preview_lens_attributes';
import { PreviewTab } from '../../preview_tab';
import * as i18n from '../../translations';
import type { Sorting } from '../../types';

const SUMMARY_TAB_EMBEDDABLE_ID = 'alertSummaryEmbeddable--id';
const PREVIEW_TAB_EMBEDDABLE_ID = 'alertsPreviewEmbeddable--id';

export const ALERT_SUMMARY_TEST_SUBJ = 'alertSummaryPreviewTab';
export const ALERTS_PREVIEW_TEST_SUBJ = 'alertsPreviewTab';

export const DEFAULT_ALERT_SUMMARY_SORT: Sorting = {
  columnId: 'count',
  direction: 'desc',
};

export const DEFAULT_ALERTS_PREVIEW_SORT: Sorting = {
  columnId: 'kibana.alert.risk_score',
  direction: 'desc',
};

export interface TabInfo {
  content: JSX.Element;
  id: string;
  name: string;
}

interface GetTabs {
  alertsPreviewStackBy0: string;
  alertSummaryStackBy0: string;
  end: string;
  filters: Filter[];
  maxAlerts: number;
  query: Query;
  setAlertsPreviewStackBy0: React.Dispatch<React.SetStateAction<string>>;
  setAlertSummaryStackBy0: React.Dispatch<React.SetStateAction<string>>;
  start: string;
}

export const getTabs = ({
  alertsPreviewStackBy0,
  alertSummaryStackBy0,
  end,
  filters,
  maxAlerts,
  query,
  setAlertsPreviewStackBy0,
  setAlertSummaryStackBy0,
  start,
}: GetTabs): TabInfo[] => [
  {
    id: 'attackDiscoverySettingsAlertSummaryTab--id',
    name: i18n.ALERT_SUMMARY,
    content: (
      <>
        <EuiSpacer />
        <PreviewTab
          dataTestSubj={ALERT_SUMMARY_TEST_SUBJ}
          embeddableId={SUMMARY_TAB_EMBEDDABLE_ID}
          end={end}
          filters={filters}
          getLensAttributes={getAlertSummaryLensAttributes}
          getPreviewEsqlQuery={getAlertSummaryEsqlQuery}
          maxAlerts={maxAlerts}
          query={query}
          setTableStackBy0={setAlertSummaryStackBy0}
          start={start}
          tableStackBy0={alertSummaryStackBy0}
        />
      </>
    ),
  },
  {
    id: 'attackDiscoverySettingsAlertsPreviewTab--id',
    name: i18n.ALERTS_PREVIEW,
    content: (
      <>
        <EuiSpacer />
        <PreviewTab
          dataTestSubj={ALERTS_PREVIEW_TEST_SUBJ}
          embeddableId={PREVIEW_TAB_EMBEDDABLE_ID}
          end={end}
          filters={filters}
          getLensAttributes={getAlertsPreviewLensAttributes}
          getPreviewEsqlQuery={getAlertsPreviewEsqlQuery}
          maxAlerts={maxAlerts}
          query={query}
          setTableStackBy0={setAlertsPreviewStackBy0}
          start={start}
          tableStackBy0={alertsPreviewStackBy0}
        />
      </>
    ),
  },
];
