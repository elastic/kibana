/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';

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

import { useRulesTableContext } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import * as i18n from './translations';
import { useGetRulesWithGaps } from '../../api/hooks/use_get_rules_with_gaps';

enum RangeValue {
  LAST_24_H = 'last_24_h',
  LAST_3_D = 'last_3_d',
  LAST_7_D = 'last_7_d',
}

const defaultRangeValue = RangeValue.LAST_24_H;

export const RulesWithGapsOverviewPanel = () => {
  const [rangeValue, setRangeValue] = useState(defaultRangeValue);
  const [showRulesWithGaps, setShowRulesWithGaps] = useState(false);
  const {
    state: {
      filterOptions: { searchGapsStart, searchGapsEnd },
    },
    actions: { setFilterOptions },
  } = useRulesTableContext();
  const { data } = useGetRulesWithGaps(
    {
      start: searchGapsStart ?? '',
      end: searchGapsEnd ?? '',
    },
    {
      enabled: Boolean(searchGapsStart) && Boolean(searchGapsEnd),
      onSuccess: (result) => {
        if (showRulesWithGaps) {
          setFilterOptions({
            ruleIds: result.rule_ids,
          });
        }
      },
    }
  );
  const [isPopoverOpen, setPopover] = useState(false);

  const rangeValueToLabel = {
    [RangeValue.LAST_24_H]: i18n.RULE_GAPS_OVERVIEW_PANEL_LAST_24_HOURS_LABEL,
    [RangeValue.LAST_3_D]: i18n.RULE_GAPS_OVERVIEW_PANEL_LAST_3_DAYS_LABEL,
    [RangeValue.LAST_7_D]: i18n.RULE_GAPS_OVERVIEW_PANEL_LAST_7_DAYS_LABEL,
  };

  useEffect(() => {
    if (rangeValue) {
      const now = new Date();
      const dayMs = 24 * 60 * 60 * 1000;
      let amountOfDays = 1;
      switch (rangeValue) {
        case RangeValue.LAST_24_H:
          amountOfDays = 1;
          break;
        case RangeValue.LAST_3_D:
          amountOfDays = 3;
          break;
        case RangeValue.LAST_7_D:
          amountOfDays = 7;
          break;
      }

      const start = new Date(now.getTime() - amountOfDays * dayMs).toISOString();
      const end = now.toISOString();
      setFilterOptions({
        searchGapsStart: start,
        searchGapsEnd: end,
      });
    }
  }, [rangeValue, setFilterOptions]);

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const items = Object.values(RangeValue).map((value) => ({
    value,
    label: rangeValueToLabel[value],
  }));

  const button = (
    <EuiButton iconType="arrowDown" iconSide="right" onClick={onButtonClick}>
      {rangeValueToLabel[rangeValue]}
    </EuiButton>
  );

  const handleShowRulesWithGapsFilterButtonClick = (value: boolean) => {
    setShowRulesWithGaps(value);
    if (!data) return;
    if (value) {
      setFilterOptions({
        ruleIds: data.rule_ids,
      });
    } else {
      setFilterOptions({
        ruleIds: [],
      });
    }
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
                    setRangeValue(item.value);
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
              withNext
              hasActiveFilters={!showRulesWithGaps}
              onClick={() => handleShowRulesWithGapsFilterButtonClick(false)}
            >
              {i18n.RULE_GAPS_OVERVIEW_PANEL_SHOW_ALL_RULES_LABEL}
            </EuiFilterButton>
            <EuiFilterButton
              hasActiveFilters={showRulesWithGaps}
              onClick={() => handleShowRulesWithGapsFilterButtonClick(true)}
            >
              {i18n.RULE_GAPS_OVERVIEW_PANEL_SHOW_RULES_WITH_GAPS_LABEL}
            </EuiFilterButton>
          </EuiFilterGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
