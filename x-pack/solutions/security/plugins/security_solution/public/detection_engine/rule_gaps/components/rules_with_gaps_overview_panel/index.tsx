/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';

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
} from '@elastic/eui';

import { gapStatus } from '@kbn/alerting-plugin/common';
import { useRulesTableContext } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import * as i18n from './translations';
import { useGetRuleIdsWithGaps } from '../../api/hooks/use_get_rule_ids_with_gaps';
import { defaultRangeValue, GapRangeValue } from '../../constants';

export const RulesWithGapsOverviewPanel = () => {
  const {
    state: {
      filterOptions: { gapSearchRange, showRulesWithGaps },
    },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const { data } = useGetRuleIdsWithGaps({
    gapRange: gapSearchRange ?? defaultRangeValue,
    statuses: [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED],
  });
  const [isPopoverOpen, setPopover] = useState(false);

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
    <EuiButton iconType="arrowDown" iconSide="right" onClick={onButtonClick}>
      {rangeValueToLabel[gapSearchRange ?? defaultRangeValue]}
    </EuiButton>
  );

  const handleShowRulesWithGapsFilterButtonClick = () => {
    setFilterOptions({
      showRulesWithGaps: !showRulesWithGaps,
    });
  };

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="flexStart"
        gutterSize="m"
        data-test-subj="rule-with-gaps_overview-panel"
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
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="xs">
            <EuiFlexItem>
              <EuiText>
                <b>{i18n.RULE_GAPS_OVERVIEW_PANEL_LABEL}</b>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={data?.total === 0 ? 'success' : 'warning'}>{data?.total}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
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
