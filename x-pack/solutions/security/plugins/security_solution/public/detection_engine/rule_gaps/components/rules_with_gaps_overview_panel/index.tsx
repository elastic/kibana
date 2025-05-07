/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiContextMenuPanel,
  EuiPopover,
  EuiContextMenuItem,
  EuiBadge,
  EuiFilterButton,
  EuiFilterGroup,
  EuiProgress,
  EuiHealth,
  useEuiTheme,
  useIsWithinMinBreakpoint,
} from '@elastic/eui';

import { gapStatus } from '@kbn/alerting-plugin/common';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { useRulesTableContext } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import * as i18n from './translations';
import { useGetRuleIdsWithGaps } from '../../api/hooks/use_get_rule_ids_with_gaps';
import { defaultRangeValue, GapRangeValue } from '../../constants';
import { ManualRuleRunEventTypes } from '../../../../common/lib/telemetry/events/manual_rule_run/types';
import { useKibana } from '../../../../common/lib/kibana';
import { useGetGlobalRuleExecutionSummary } from '../../api/hooks/use_get_global_rule_execution_summary';

const DoubleDivider = styled.div`
  border-right: ${(props) => props.theme.euiTheme.border.thin};
  padding-left: ${(props) => props.theme.euiTheme.size.base};
  margin-right: ${(props) => props.theme.euiTheme.size.base};
  height: ${(props) => props.theme.euiTheme.size.l};
`;

const SingleDivider = styled.div`
  padding-left: ${(props) => props.theme.euiTheme.size.base};
  height: ${(props) => props.theme.euiTheme.size.l};
`;

export const RulesWithGapsOverviewPanel = () => {
  const {
    state: {
      filterOptions: { gapSearchRange, showRulesWithGaps },
    },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const { data, isLoading: isLoadingGapsData } = useGetRuleIdsWithGaps({
    gapRange: gapSearchRange ?? defaultRangeValue,
    statuses: [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED],
  });
  const { data: executionSummaryData, isLoading: executionSummaryIsLoading } =
    useGetGlobalRuleExecutionSummary({
      range: gapSearchRange ?? defaultRangeValue,
    });
  const [isPopoverOpen, setPopover] = useState(false);
  const telemetry = useKibana().services.telemetry;
  const theme = useEuiTheme();
  const isMediumOrBiggerScreen = useIsWithinMinBreakpoint('m');

  useEffect(() => {
    return () => {
      // reset filter options when unmounting
      setFilterOptions({
        gapSearchRange: defaultRangeValue,
        showRulesWithGaps: false,
      });
    };
  }, [setFilterOptions]);

  const rangeValueToLabel = {
    [GapRangeValue.LAST_24_H]: i18n.RULE_GAPS_OVERVIEW_PANEL_LAST_24_HOURS_LABEL,
    [GapRangeValue.LAST_3_D]: i18n.RULE_GAPS_OVERVIEW_PANEL_LAST_3_DAYS_LABEL,
    [GapRangeValue.LAST_7_D]: i18n.RULE_GAPS_OVERVIEW_PANEL_LAST_7_DAYS_LABEL,
  };

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const items = Object.values(GapRangeValue).map((value) => ({
    value,
    label: rangeValueToLabel[value],
  }));

  const button = (
    <EuiButton
      iconType="arrowDown"
      iconSide="right"
      onClick={onButtonClick}
      data-test-subj="select-time-range-button"
    >
      {rangeValueToLabel[gapSearchRange ?? defaultRangeValue]}
    </EuiButton>
  );

  const handleShowRulesWithGapsFilterButtonClick = () => {
    if (!showRulesWithGaps) {
      telemetry.reportEvent(ManualRuleRunEventTypes.ShowOnlyRulesWithGaps, {
        dateRange: gapSearchRange ?? defaultRangeValue,
      });
    }
    setFilterOptions({
      showRulesWithGaps: !showRulesWithGaps,
    });
  };

  const executionSuccessRate =
    typeof executionSummaryData?.executions.total !== 'number'
      ? 0
      : Math.round(
          (100 * executionSummaryData.executions.success) / executionSummaryData.executions.total
        );

  const gapsCounterBadgeColor = isLoadingGapsData
    ? 'hollow'
    : data?.total === 0
    ? 'success'
    : 'warning';

  const DoubleDividerElement = isMediumOrBiggerScreen ? (
    <EuiFlexItem grow={false}>
      <DoubleDivider theme={theme} />
    </EuiFlexItem>
  ) : null;

  const SingleDividerElement = isMediumOrBiggerScreen ? (
    <EuiFlexItem grow={false}>
      <SingleDivider />
    </EuiFlexItem>
  ) : null;

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="flexStart"
        gutterSize="none"
        data-test-subj="rule-with-gaps_overview-panel"
        wrap
      >
        <EuiFlexItem grow={false}>
          <EuiPopover
            id={'rules_with_gaps_overview_panel'}
            button={button}
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel
              size="s"
              items={items.map((item) => (
                <EuiContextMenuItem
                  key={item.value}
                  onClick={() => {
                    setFilterOptions({
                      gapSearchRange: item.value,
                    });
                    closePopover();
                  }}
                >
                  {item.label}
                </EuiContextMenuItem>
              ))}
            />
          </EuiPopover>
        </EuiFlexItem>

        {DoubleDividerElement}

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiText
                size="xs"
                css={css`
                  font-weight: ${theme.euiTheme.font.weight.semiBold};
                `}
              >
                {i18n.RULE_GAPS_OVERVIEW_EXECUTION_SUCCESS_RATE_LABEL}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" data-test-subj="rule-execution-success-rate-label">
                {executionSuccessRate}
                {'%'}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiProgress
                css={css`
                  width: 50px;
                  ${executionSummaryIsLoading
                    ? ''
                    : `background-color: ${theme.euiTheme.colors.danger}`}
                `}
                valueText={false}
                color="success"
                value={executionSuccessRate}
                max={100}
                size="s"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {DoubleDividerElement}

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="xs">
            <EuiFlexItem>
              <EuiText
                size="xs"
                css={css`
                  font-weight: ${theme.euiTheme.font.weight.semiBold};
                `}
              >
                {i18n.RULE_GAPS_OVERVIEW_LAST_EXECUTION_STATUS_LABEL}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiHealth
                color="success"
                textSize="xs"
                data-test-subj="last-rule-execution-success-count-label"
              >
                {i18n.RULE_GAPS_OVERVIEW_LAST_EXECUTION_SUCCESS_LABEL}{' '}
                {executionSummaryData?.latestExecutionSummary.success}
              </EuiHealth>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiHealth
                color="danger"
                textSize="xs"
                data-test-subj="last-rule-execution-failure-count-label"
              >
                {i18n.RULE_GAPS_OVERVIEW_LAST_EXECUTION_FAILURE_LABEL}{' '}
                {executionSummaryData?.latestExecutionSummary.failure}
              </EuiHealth>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiHealth
                color="warning"
                textSize="xs"
                data-test-subj="last-rule-execution-warning-count-label"
              >
                {i18n.RULE_GAPS_OVERVIEW_LAST_EXECUTION_WARNING_LABEL}{' '}
                {executionSummaryData?.latestExecutionSummary.warning}
              </EuiHealth>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {DoubleDividerElement}

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="xs">
            <EuiFlexItem>
              <EuiText
                size="xs"
                css={css`
                  font-weight: ${theme.euiTheme.font.weight.semiBold};
                `}
              >
                {i18n.RULE_GAPS_OVERVIEW_PANEL_LABEL}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={gapsCounterBadgeColor}>{data?.total}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {SingleDividerElement}

        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <EuiFilterButton
              hasActiveFilters={showRulesWithGaps}
              onClick={handleShowRulesWithGapsFilterButtonClick}
              iconType={showRulesWithGaps ? `checkInCircleFilled` : undefined}
            >
              {i18n.RULE_GAPS_OVERVIEW_PANEL_SHOW_RULES_WITH_GAPS_LABEL}
            </EuiFilterButton>
          </EuiFilterGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
