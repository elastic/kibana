/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner, EuiPageTemplate, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { NightshiftAppHeader } from '../../app/app_header';
import type { NightshiftAppHeaderProps } from '../../app/app_header';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../common/ebt_constants';
import { useDetectionOverview } from '../../data/detection_overview/use_detection_overview';
import { useMaintenanceStatus } from '../../data/maintenance/use_significant_events_maintenance';
import { useKibana } from '../../hooks/use_kibana';
import type { DetectionTabId } from './detection_tabs';
import { DETECTION_TAB_IDS, DETECTION_TAB_LABELS } from './detection_tabs';
import { DetectionOverview } from './overview/detection_overview';
import {
  RANGE_FROM_QUERY_PARAM,
  RANGE_TO_QUERY_PARAM,
  useDetectionTimeRange,
} from './use_detection_time_range';

const EventsTab = React.lazy(() =>
  import('./events/events_tab').then(({ EventsTab: Tab }) => ({ default: Tab }))
);

export type DetectionPageHeaderProps = Pick<
  NightshiftAppHeaderProps,
  | 'onSourcesClick'
  | 'sourcesHref'
  | 'onKnowledgeClick'
  | 'knowledgeHref'
  | 'onSettingsClick'
  | 'settingsHref'
  | 'onSandboxSecretsClick'
  | 'onAutomationsClick'
  | 'automationsHref'
>;

export const DetectionPage = ({
  headerProps,
  tab,
}: {
  headerProps: DetectionPageHeaderProps;
  tab: DetectionTabId;
}): React.ReactElement => {
  const { application } = useKibana().services;
  const history = useHistory();
  const maintenanceStatus = useMaintenanceStatus();
  const { timeRange, setTimeRange } = useDetectionTimeRange();
  const overview = useDetectionOverview(timeRange);
  // Tabs share only the time range; filters and the open flyout belong to one tab.
  const tabSearch = `?${new URLSearchParams({
    [RANGE_FROM_QUERY_PARAM]: timeRange.from,
    [RANGE_TO_QUERY_PARAM]: timeRange.to,
  }).toString()}`;

  return (
    <>
      <NightshiftAppHeader
        {...headerProps}
        page="detection"
        back={{
          href: application.getUrlForApp(NIGHTSHIFT_APP_ID, { path: '/' }),
          label: i18n.translate('xpack.nightshift.detectionPage.backToNightshiftLabel', {
            defaultMessage: 'Nightshift',
          }),
        }}
      />
      <EuiPageTemplate.Section component="div" restrictWidth={false}>
        <DetectionOverview
          status={maintenanceStatus.data}
          isStatusLoading={maintenanceStatus.isLoading}
          isStatusError={maintenanceStatus.isError}
          counts={overview.data}
          isCountsLoading={overview.isLoading}
          isCountsError={overview.isError}
          onRetry={() => void overview.refetch()}
        />
        <EuiSpacer size="m" />
        <EuiTabs size="s">
          {DETECTION_TAB_IDS.map((id) => (
            <EuiTab
              key={id}
              isSelected={tab === id}
              {...reactRouterNavigate(history, `/detections/${id}${tabSearch}`)}
              data-test-subj={`nightshiftDetectionTab-${id}`}
              {...getEbtProps({
                action: NIGHTSHIFT_EBT_ACTIONS.VIEW_DETECTION_TAB,
                element: NIGHTSHIFT_EBT_ELEMENTS.DETECTION_WORKSPACE_TABS,
                detail: id,
              })}
            >
              {DETECTION_TAB_LABELS[id]}
            </EuiTab>
          ))}
        </EuiTabs>
        <EuiSpacer size="m" />
        <React.Suspense
          fallback={
            <EuiLoadingSpinner size="xl" data-test-subj="nightshiftDetectionEventsTabLoading" />
          }
        >
          {tab === 'events' && <EventsTab timeRange={timeRange} onTimeRangeChange={setTimeRange} />}
        </React.Suspense>
      </EuiPageTemplate.Section>
    </>
  );
};
