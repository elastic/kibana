/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiToolTip } from '@elastic/eui';

import { gapFillStatus } from '@kbn/alerting-plugin/common';
import { useRulesTableContext } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import * as i18n from './translations';
import { useGetRuleIdsWithGaps } from '../../api/hooks/use_get_rule_ids_with_gaps';
import { defaultRangeValue } from '../../constants';
import { GapAutoFillStatus } from './gap_auto_fill_status';

export const RulesWithGapsOverviewPanel = () => {
  const {
    state: { lastUpdated: rulesTableLastUpdatedAt },
  } = useRulesTableContext();
  // Total rules with gaps: unfilled or in progress
  const { data: totalRulesWithGaps, refetch: refetchGetRuleIdsWithGaps } = useGetRuleIdsWithGaps({
    gapRange: defaultRangeValue,
    gapFillStatuses: [gapFillStatus.UNFILLED, gapFillStatus.IN_PROGRESS],
  });

  // Rules with in-progress gaps
  const { data: inProgressRulesWithGaps, refetch: refetchGetRuleIdsWithGapsInProgressIntervals } =
    useGetRuleIdsWithGaps({
      gapRange: defaultRangeValue,
      gapFillStatuses: [gapFillStatus.IN_PROGRESS],
    });

  useEffect(() => {
    refetchGetRuleIdsWithGaps();
    refetchGetRuleIdsWithGapsInProgressIntervals();
  }, [
    rulesTableLastUpdatedAt,
    refetchGetRuleIdsWithGaps,
    refetchGetRuleIdsWithGapsInProgressIntervals,
  ]);
  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="m"
        data-test-subj="rule-with-gaps_overview-panel"
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="xs">
            <EuiFlexItem>
              <EuiText>
                <b>{i18n.RULE_GAPS_OVERVIEW_PANEL_LABEL}</b>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip position="bottom" content={i18n.RULE_GAPS_OVERVIEW_PANEL_TOOLTIP_TEXT}>
                <EuiBadge
                  tabIndex={0}
                  color={(totalRulesWithGaps?.total ?? 0) === 0 ? 'success' : 'warning'}
                >
                  {totalRulesWithGaps?.total ?? 0} {'/'} {inProgressRulesWithGaps?.total ?? 0}
                </EuiBadge>
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <GapAutoFillStatus />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
