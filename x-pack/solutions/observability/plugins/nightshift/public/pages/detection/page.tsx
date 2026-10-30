/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  euiCanAnimate,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type UIEvent,
} from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { NightshiftAppHeader } from '../../components/app_header';
import type { NightshiftAppHeaderProps } from '../../components/app_header';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../common/ebt_constants';
import {
  NIGHTSHIFT_EVENT_ID_QUERY_PARAM,
  NIGHTSHIFT_RULE_ID_QUERY_PARAM,
  NIGHTSHIFT_SIGNAL_ID_QUERY_PARAM,
} from '../../common/url_params';
import { useDetectionOverview } from '../../data/detection_overview/use_detection_overview';
import { useMaintenanceStatus } from '../../data/maintenance/use_significant_events_maintenance';
import { useKibana } from '../../hooks/use_kibana';
import { useDeveloperMode } from '../../hooks/use_developer_mode';
import type { DetectionTabId } from './detection_tabs';
import { DETECTION_TAB_LABELS, getVisibleDetectionTabs } from './detection_tabs';
import { DetectionOverview } from './overview/detection_overview';
import { EntitiesPanel } from './entities/entities_panel';
import { PAGE_QUERY_PARAM } from './constants';
import { RunLimitsBanner } from './run_limits_banner';
import { useEntitySelection } from './use_entity_selection';
import {
  RANGE_FROM_QUERY_PARAM,
  RANGE_TO_QUERY_PARAM,
  useDetectionTimeRange,
} from './use_detection_time_range';

const EventsTab = lazy(() =>
  import('./events/events_tab').then(({ EventsTab: Tab }) => ({ default: Tab }))
);

const RulesTab = lazy(() =>
  import('./rules/rules_tab').then(({ RulesTab: Tab }) => ({ default: Tab }))
);

const SignalsTab = lazy(() =>
  import('./signals/signals_tab').then(({ SignalsTab: Tab }) => ({ default: Tab }))
);

export type DetectionPageHeaderProps = Pick<
  NightshiftAppHeaderProps,
  | 'onSourcesClick'
  | 'sourcesHref'
  | 'onKnowledgeClick'
  | 'knowledgeHref'
  | 'onSettingsClick'
  | 'settingsHref'
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
  const location = useLocation();
  const { euiTheme } = useEuiTheme();
  const maintenanceStatus = useMaintenanceStatus();
  const { isDeveloperMode } = useDeveloperMode();
  const { timeRange, setTimeRange } = useDetectionTimeRange();
  const overview = useDetectionOverview(timeRange);
  const selection = useEntitySelection();
  const [isOverviewCompact, setIsOverviewCompact] = useState(false);
  const fullOverviewSlotRef = useRef<HTMLDivElement>(null);
  useEffect(() => setIsOverviewCompact(false), [tab]);
  const handleTabBodyScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;
      const collapseThreshold = euiTheme.base / 2;
      setIsOverviewCompact((isCompact) => {
        if (isCompact) {
          return scrollTop > collapseThreshold;
        }

        const expandedOverviewHeight = fullOverviewSlotRef.current?.offsetHeight ?? 0;
        const compactMaxScrollTop = scrollHeight - clientHeight - expandedOverviewHeight;
        return scrollTop > collapseThreshold && compactMaxScrollTop > collapseThreshold;
      });
    },
    [euiTheme.base]
  );
  // Tab switches keep every filter, so returning to a tab restores it; only pages and flyouts reset.
  const tabParams = new URLSearchParams(location.search);
  [
    PAGE_QUERY_PARAM,
    NIGHTSHIFT_EVENT_ID_QUERY_PARAM,
    NIGHTSHIFT_RULE_ID_QUERY_PARAM,
    NIGHTSHIFT_SIGNAL_ID_QUERY_PARAM,
  ].forEach((param) => tabParams.delete(param));
  tabParams.set(RANGE_FROM_QUERY_PARAM, timeRange.from);
  tabParams.set(RANGE_TO_QUERY_PARAM, timeRange.to);
  const tabSearch = `?${tabParams.toString()}`;
  const overviewProps = {
    status: maintenanceStatus.data,
    isStatusLoading: maintenanceStatus.isLoading,
    isStatusError: maintenanceStatus.isError,
    counts: overview.data,
    isCountsLoading: overview.isLoading,
    isCountsError: overview.isError,
    onRetry: () => void overview.refetch(),
  };
  const overviewSlotStyles = (expanded: boolean, spaceAfter = false) => css`
    display: grid;
    grid-template-rows: ${expanded ? '1fr' : '0fr'};
    opacity: ${expanded ? 1 : 0};
    visibility: ${expanded ? 'visible' : 'hidden'};
    margin-block-end: ${expanded && spaceAfter ? euiTheme.size.m : 0};

    ${euiCanAnimate} {
      transition: grid-template-rows ${euiTheme.animation.normal} ${euiTheme.animation.resistance},
        opacity ${euiTheme.animation.normal} ${euiTheme.animation.resistance},
        margin-block-end ${euiTheme.animation.normal} ${euiTheme.animation.resistance},
        visibility 0s linear ${expanded ? '0s' : euiTheme.animation.normal};
    }

    > * {
      min-height: 0;
      overflow: hidden;
    }
  `;

  return (
    <div
      css={css`
        display: flex;
        flex: 1 1 auto;
        flex-direction: column;
        min-height: 0;
      `}
      data-test-subj="nightshiftDetectionPage"
    >
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
      <EuiPageTemplate.Section
        component="div"
        restrictWidth={false}
        grow
        css={css`
          min-height: 0;
          overflow: hidden;
        `}
        contentProps={{
          css: css`
            display: flex;
            flex: 1 1 auto;
            flex-direction: column;
            min-height: 0;
          `,
        }}
      >
        <RunLimitsBanner />
        <div
          ref={fullOverviewSlotRef}
          css={overviewSlotStyles(!isOverviewCompact)}
          data-test-subj="nightshiftDetectionOverviewFullSlot"
          data-collapsed={isOverviewCompact ? 'true' : undefined}
        >
          <div>
            <DetectionOverview {...overviewProps} />
            <EuiSpacer size="m" />
          </div>
        </div>
        <EuiFlexGroup
          gutterSize="l"
          alignItems="stretch"
          css={css`
            flex: 1 1 auto;
            min-height: 0;
          `}
        >
          <EuiFlexItem
            grow={false}
            css={css`
              width: ${euiTheme.base * 16}px;
              min-height: 0;
            `}
          >
            <div
              css={overviewSlotStyles(isOverviewCompact, true)}
              data-test-subj="nightshiftDetectionOverviewCompactSlot"
              data-collapsed={!isOverviewCompact ? 'true' : undefined}
            >
              <div>
                <DetectionOverview {...overviewProps} compact />
              </div>
            </div>
            <EntitiesPanel
              timeRange={timeRange}
              selection={selection}
              knowledgeHref={headerProps.knowledgeHref}
              onKnowledgeClick={headerProps.onKnowledgeClick}
            />
          </EuiFlexItem>
          <EuiFlexItem
            css={css`
              display: flex;
              flex-direction: column;
              min-width: 0;
              min-height: 0;
            `}
          >
            <EuiTabs size="s">
              {getVisibleDetectionTabs(isDeveloperMode).map((id) => (
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
            <div
              css={css`
                flex: 1 1 auto;
                min-height: 0;
                overflow: auto;
              `}
              data-test-subj="nightshiftDetectionTabBody"
              onScroll={handleTabBodyScroll}
            >
              <Suspense
                fallback={
                  <EuiLoadingSpinner size="xl" data-test-subj="nightshiftDetectionTabLoading" />
                }
              >
                {tab === 'events' && (
                  <EventsTab
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                    entities={selection.entities}
                    unassigned={selection.unassigned}
                  />
                )}
                {tab === 'rules' && (
                  <RulesTab
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                    entities={selection.entities}
                    unassigned={selection.unassigned}
                  />
                )}
                {tab === 'signals' && isDeveloperMode && (
                  <SignalsTab
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                    entities={selection.entities}
                    unassigned={selection.unassigned}
                  />
                )}
              </Suspense>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </div>
  );
};
