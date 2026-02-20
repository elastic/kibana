/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useIsWithinMaxBreakpoint,
  useIsWithinMinBreakpoint,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { ALERT_SEVERITY, ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { FILTER_ACKNOWLEDGED, FILTER_CLOSED, FILTER_OPEN } from '../../../../../common/types';
import { useNavigateToAlertsPageWithFilters } from '../../../../common/hooks/use_navigate_to_alerts_page_with_filters';
import type { ESBoolQuery } from '../../../../../common/typed_json';
import type { FillColor } from '../../../../common/components/charts/donutchart';
import { DonutChart } from '../../../../common/components/charts/donutchart';
import { SecurityPageName } from '../../../../../common/constants';
import { HeaderSection } from '../../../../common/components/header_section';
import { HoverVisibilityContainer } from '../../../../common/components/hover_visibility_container';
import { BUTTON_CLASS as INPECT_BUTTON_CLASS } from '../../../../common/components/inspect';
import type { LegendItem } from '../../../../common/components/charts/legend_item';
import type { EntityFilter } from './use_alerts_by_status';
import { useAlertsByStatus } from './use_alerts_by_status';
import {
  ALERTS,
  ALERTS_BY_SEVERITY_TEXT,
  ALERTS_TEXT,
  INVESTIGATE_IN_TIMELINE,
  OPEN_IN_ALERTS_TITLE_SEVERITY,
  OPEN_IN_ALERTS_TITLE_STATUS,
  STATUS_ACKNOWLEDGED,
  STATUS_CLOSED,
  STATUS_CRITICAL_LABEL,
  STATUS_HIGH_LABEL,
  STATUS_LOW_LABEL,
  STATUS_MEDIUM_LABEL,
  STATUS_OPEN,
} from '../translations';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { VIEW_ALERTS } from '../../../pages/translations';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { ChartLabel } from './chart_label';
import { Legend } from '../../../../common/components/charts/legend';
import { LastUpdatedAt } from '../../../../common/components/last_updated_at';
import { LinkButton, useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import { useNavigateToTimeline } from '../hooks/use_navigate_to_timeline';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useAlertsByStatusVisualizationData } from './use_alerts_by_status_visualization_data';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from './types';
import type { Status } from '../../../../../common/api/detection_engine';
import { getRiskSeverityColors } from '../../../../common/utils/risk_color_palette';

const StyledFlexItem = styled(EuiFlexItem)`
  padding: 0 4px;
`;

const StyledLegendFlexItem = styled(EuiFlexItem)`
  padding-left: 32px;
  padding-top: 45px;
`;

interface AlertsByStatusProps {
  additionalFilters?: ESBoolQuery[];
  applyGlobalQueriesAndFilters?: boolean;
  entityFilter?: EntityFilter;
  signalIndexName: string | null;
}

const getChartConfigs = (euiTheme: EuiThemeComputed) => {
  const palette = getRiskSeverityColors(euiTheme);

  return [
    { key: 'critical', label: STATUS_CRITICAL_LABEL, color: palette.critical },
    { key: 'high', label: STATUS_HIGH_LABEL, color: palette.high },
    { key: 'medium', label: STATUS_MEDIUM_LABEL, color: palette.medium },
    { key: 'low', label: STATUS_LOW_LABEL, color: palette.low },
  ].map((config) => ({
    ...config,
    field: ALERT_SEVERITY,
    value: config.label,
  }));
};

const eventKindSignalFilter: EntityFilter = {
  field: 'event.kind',
  value: 'signal',
};

export const AlertsByStatus = ({
  additionalFilters,
  applyGlobalQueriesAndFilters = true,
  signalIndexName,
  entityFilter,
}: AlertsByStatusProps) => {
  const { euiTheme } = useEuiTheme();
  const { toggleStatus, setToggleStatus } = useQueryToggle(DETECTION_RESPONSE_ALERTS_BY_STATUS_ID);
  const { openTimelineWithFilters } = useNavigateToTimeline();
  const navigateToAlerts = useNavigateToAlertsPageWithFilters();
  const {
    timelinePrivileges: { read: canAccessTimelines },
  } = useUserPrivileges();
  const { onClick: goToAlerts, href } = useGetSecuritySolutionLinkProps()({
    deepLinkId: SecurityPageName.alerts,
  });

  const { to, from } = useGlobalTime();

  const isLargerBreakpoint = useIsWithinMinBreakpoint('xl');
  const isSmallBreakpoint = useIsWithinMaxBreakpoint('s');
  const donutHeight = isSmallBreakpoint || isLargerBreakpoint ? 120 : 90;

  const detailsButtonOptions = useMemo(
    () => ({
      name: canAccessTimelines && entityFilter ? INVESTIGATE_IN_TIMELINE : VIEW_ALERTS,
      href: canAccessTimelines && entityFilter ? undefined : href,
      onClick:
        canAccessTimelines && entityFilter
          ? async () => {
              await openTimelineWithFilters([[entityFilter, eventKindSignalFilter]]);
            }
          : goToAlerts,
    }),
    [entityFilter, href, goToAlerts, openTimelineWithFilters, canAccessTimelines]
  );

  const {
    items: donutData,
    isLoading: loading,
    updatedAt,
  } = useAlertsByStatus({
    additionalFilters,
    entityFilter,
    signalIndexName,
    skip: !toggleStatus,
    queryId: DETECTION_RESPONSE_ALERTS_BY_STATUS_ID,
    to,
    from,
  });
  const legendItems: LegendItem[] = useMemo(() => getChartConfigs(euiTheme), [euiTheme]);

  const navigateToAlertsWithStatus = useCallback(
    (status: Status, level?: string) =>
      navigateToAlerts([
        {
          title: OPEN_IN_ALERTS_TITLE_STATUS,
          selected_options: [status],
          field_name: ALERT_WORKFLOW_STATUS,
        },
        ...(level
          ? [
              {
                title: OPEN_IN_ALERTS_TITLE_SEVERITY,
                selected_options: [level],
                field_name: ALERT_SEVERITY,
              },
            ]
          : []),
        ...(entityFilter
          ? [
              {
                selected_options: [entityFilter.value],
                field_name: entityFilter.field,
              },
            ]
          : []),
      ]),
    [entityFilter, navigateToAlerts]
  );

  const navigateToAlertsWithStatusOpen = useCallback(
    (level?: string) => navigateToAlertsWithStatus(FILTER_OPEN, level?.toLocaleLowerCase()),
    [navigateToAlertsWithStatus]
  );

  const navigateToAlertsWithStatusAcknowledged = useCallback(
    (level?: string) => navigateToAlertsWithStatus(FILTER_ACKNOWLEDGED, level?.toLocaleLowerCase()),
    [navigateToAlertsWithStatus]
  );

  const navigateToAlertsWithStatusClosed = useCallback(
    (level?: string) => navigateToAlertsWithStatus(FILTER_CLOSED, level?.toLocaleLowerCase()),
    [navigateToAlertsWithStatus]
  );

  const openCount = donutData?.open?.total ?? 0;
  const acknowledgedCount = donutData?.acknowledged?.total ?? 0;
  const closedCount = donutData?.closed?.total ?? 0;

  const totalAlerts =
    loading || donutData == null ? 0 : openCount + acknowledgedCount + closedCount;

  const { total: visualizationTotalAlerts } = useAlertsByStatusVisualizationData();

  const fillColor: FillColor = useCallback(
    (dataName: string) =>
      legendItems.find(({ value }) => value === dataName)?.color ?? euiTheme.colors.textSubdued,
    [euiTheme.colors.textSubdued, legendItems]
  );

  return (
    <>
      <HoverVisibilityContainer show={true} targetClassNames={[INPECT_BUTTON_CLASS]}>
        <EuiPanel hasBorder data-test-subj={`${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}-panel`}>
          {loading && (
            <EuiProgress
              data-test-subj="initialLoadingPanelMatrixOverTime"
              size="xs"
              position="absolute"
              color="accent"
            />
          )}
          <HeaderSection
            id={DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}
            title={entityFilter ? ALERTS_BY_SEVERITY_TEXT : ALERTS_TEXT}
            titleSize="m"
            subtitle={<LastUpdatedAt isUpdating={loading} updatedAt={updatedAt} />}
            inspectMultiple
            toggleStatus={toggleStatus}
            toggleQuery={setToggleStatus}
          >
            <EuiFlexGroup alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                <LinkButton
                  data-test-subj="view-details-button"
                  onClick={detailsButtonOptions.onClick}
                  href={detailsButtonOptions.href}
                >
                  {detailsButtonOptions.name}
                </LinkButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </HeaderSection>
          {toggleStatus && (
            <>
              <EuiFlexGroup justifyContent="center" gutterSize="none">
                <EuiFlexItem grow={false}>
                  <EuiText className="eui-textCenter" size="s">
                    {totalAlerts !== 0 ||
                      (visualizationTotalAlerts !== 0 && (
                        <>
                          <b>
                            <FormattedCount count={totalAlerts} />
                          </b>
                          <> </>
                          <small>{ALERTS(totalAlerts)}</small>
                        </>
                      ))}
                  </EuiText>

                  <EuiSpacer size="l" />
                  <EuiFlexGroup justifyContent="center">
                    <StyledFlexItem key="alerts-status-open" grow={false}>
                      <DonutChart
                        onPartitionClick={navigateToAlertsWithStatusOpen}
                        data={donutData?.open?.severities}
                        fillColor={fillColor}
                        height={donutHeight}
                        label={STATUS_OPEN}
                        title={
                          <ChartLabel onClick={navigateToAlertsWithStatusOpen} count={openCount} />
                        }
                        totalCount={openCount}
                      />
                    </StyledFlexItem>
                    <StyledFlexItem key="alerts-status-acknowledged" grow={false}>
                      <DonutChart
                        data={donutData?.acknowledged?.severities}
                        fillColor={fillColor}
                        height={donutHeight}
                        label={STATUS_ACKNOWLEDGED}
                        onPartitionClick={navigateToAlertsWithStatusAcknowledged}
                        title={
                          <ChartLabel
                            onClick={navigateToAlertsWithStatusAcknowledged}
                            count={acknowledgedCount}
                          />
                        }
                        totalCount={acknowledgedCount}
                      />
                    </StyledFlexItem>
                    <StyledFlexItem key="alerts-status-closed" grow={false}>
                      <DonutChart
                        data={donutData?.closed?.severities}
                        fillColor={fillColor}
                        height={donutHeight}
                        label={STATUS_CLOSED}
                        onPartitionClick={navigateToAlertsWithStatusClosed}
                        title={
                          <ChartLabel
                            onClick={navigateToAlertsWithStatusClosed}
                            count={closedCount}
                          />
                        }
                        totalCount={closedCount}
                      />
                    </StyledFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <StyledLegendFlexItem grow={false}>
                  {legendItems.length > 0 && <Legend legendItems={legendItems} />}
                </StyledLegendFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
            </>
          )}
        </EuiPanel>
      </HoverVisibilityContainer>
    </>
  );
};
