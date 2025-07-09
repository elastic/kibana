/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { sum } from 'lodash/fp';
import { i18n } from '@kbn/i18n';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAddFilter } from '../../../../../common/hooks/use_add_filter';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useQueryInspector } from '../../../../../common/components/page/manage_query';
import { useQueryToggle } from '../../../../../common/containers/query_toggle';
import { EntityType, RiskScoreFields } from '../../../../../../common/search_strategy';
import { SecuritySolutionLinkAnchor } from '../../../../../common/components/links';
import { ChartLabel } from '../../../../../overview/components/detection_response/alerts_by_status/chart_label';
import { DonutChart } from '../../../../../common/components/charts/donutchart';
import { HeaderSection } from '../../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../../common/components/inspect';
import { SEVERITY_UI_SORT_ORDER } from '../../../../common';
import { useRiskScoreFillColor } from '../../../risk_score_donut_chart/use_risk_score_fill_color';
import { RISK_LEVELS_PRIVILEGED_USERS_QUERY_ID } from '../../queries/risk_level_esql_query';
import { useRiskLevelsPrivilegedUserQuery, useRiskLevelsTableColumns } from './hooks';
import { EnableRiskScore } from '../../../enable_risk_score';

const TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.riskLevels.title',
  { defaultMessage: 'Risk levels of privileged users' }
);

export const DONUT_CHART_HEIGHT = 160;

export const RiskLevelsPrivilegedUsersPanel: React.FC<{ spaceId: string }> = ({ spaceId }) => {
  const fillColor = useRiskScoreFillColor();
  const { toggleStatus, setToggleStatus } = useQueryToggle(RISK_LEVELS_PRIVILEGED_USERS_QUERY_ID);
  const { deleteQuery, setQuery } = useGlobalTime();
  const columns = useRiskLevelsTableColumns();
  const { records, isLoading, refetch, inspect, isError, hasEngineBeenInstalled } =
    useRiskLevelsPrivilegedUserQuery({
      skip: !toggleStatus,
      spaceId,
    });

  const total = sum(records.map(({ count }) => count));

  const severityTableData = useMemo(
    () =>
      SEVERITY_UI_SORT_ORDER.map((level) => {
        const count = records.find((item) => item.level === level)?.count ?? 0;
        return {
          level,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0,
          total,
        };
      }).reverse(),
    [records, total]
  );

  const donutChartData = useMemo(
    () =>
      severityTableData.map(({ level, count }) => ({
        key: level,
        value: count,
      })),
    [severityTableData]
  );

  const addFilter = useAddFilter();

  const onDonutPartitionClicked = useCallback(
    (level: string) => {
      addFilter({ field: RiskScoreFields.userRisk, value: level });
    },
    [addFilter]
  );

  useQueryInspector({
    deleteQuery,
    inspect,
    refetch,
    setQuery,
    queryId: RISK_LEVELS_PRIVILEGED_USERS_QUERY_ID,
    loading: isLoading,
  });

  const isDisabled = !hasEngineBeenInstalled && !isLoading;

  if (isDisabled) {
    return (
      <EuiPanel hasBorder>
        <EnableRiskScore isDisabled={isDisabled} entityType={EntityType.user} />
      </EuiPanel>
    );
  }

  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder hasShadow={false} data-test-subj="severity-level-panel">
        <HeaderSection
          hideSubtitle
          toggleStatus={toggleStatus}
          toggleQuery={setToggleStatus}
          id={RISK_LEVELS_PRIVILEGED_USERS_QUERY_ID}
          inspectTitle={TITLE}
          title={TITLE}
          titleSize="s"
          outerDirection={'column'}
        >
          <SecuritySolutionLinkAnchor deepLinkId={SecurityPageName.entityAnalytics}>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.riskLevels.tableTitle"
              defaultMessage="View more in Risk Analytics"
            />
          </SecuritySolutionLinkAnchor>
        </HeaderSection>
        {toggleStatus &&
          (isError ? (
            <div>
              <EuiCallOut
                title={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.riskLevels.errorLoadingData',
                  {
                    defaultMessage: 'Error loading data',
                  }
                )}
                color="danger"
                iconType="error"
              />
            </div>
          ) : (
            <EuiFlexGroup responsive={false}>
              <EuiFlexItem grow={2}>
                <EuiBasicTable
                  responsiveBreakpoint={false}
                  data-test-subj="severity-level-table"
                  compressed
                  columns={columns}
                  items={severityTableData}
                  loading={isLoading}
                  id={RISK_LEVELS_PRIVILEGED_USERS_QUERY_ID}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <DonutChart
                  data={donutChartData ?? null}
                  fillColor={fillColor}
                  height={DONUT_CHART_HEIGHT}
                  label={
                    <FormattedMessage
                      id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.riskLevels.totalLabel"
                      defaultMessage="privileged users"
                    />
                  }
                  title={<ChartLabel count={total} />}
                  totalCount={total}
                  onPartitionClick={onDonutPartitionClicked}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
      </EuiPanel>
    </InspectButtonContainer>
  );
};
