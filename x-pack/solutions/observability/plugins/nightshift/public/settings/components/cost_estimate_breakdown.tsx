/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  COST_BUDGET_GROUPS,
  type BudgetGroupCost,
  type CostBudgetGroup,
  type CostResponse,
  type PeriodCost,
} from '@kbn/significant-events-plugin/common';

const PRICING_URL =
  'https://cloud.elastic.co/cloud-pricing-table?productType=serverless&solution=elasticsearch';

type CostBreakdownRow = {
  group: CostBudgetGroup;
  groupLabel: string;
  todayGroup: BudgetGroupCost;
  monthGroup: BudgetGroupCost;
};

const GROUP_LABELS: Record<CostBudgetGroup, string> = {
  discovery: i18n.translate('xpack.nightshift.settings.costEstimate.discoveryRowTitle', {
    defaultMessage: 'Discovery',
  }),
  investigation: i18n.translate('xpack.nightshift.settings.costEstimate.investigationRowTitle', {
    defaultMessage: 'Investigation',
  }),
  ki_extraction: i18n.translate('xpack.nightshift.settings.costEstimate.kiExtractionRowTitle', {
    defaultMessage: 'KI extraction',
  }),
};

const PARTIAL_FLOOR_LABEL = i18n.translate(
  'xpack.nightshift.settings.costEstimate.partialFloorBadge',
  {
    defaultMessage: 'Partial floor',
  }
);

const formatUsd = (value: number): string => {
  if (value > 0 && value < 0.01) {
    return '<$0.01';
  }
  return `~$${value.toFixed(2)}`;
};

const formatCostValue = (totalTokens: number, estimatedCost: number | null): string => {
  if (totalTokens === 0) {
    return i18n.translate('xpack.nightshift.settings.costEstimate.noRecordedCallsLabel', {
      defaultMessage: 'No recorded calls',
    });
  }
  if (estimatedCost === null) {
    return i18n.translate('xpack.nightshift.settings.costEstimate.unableToCalculateLabel', {
      defaultMessage: 'Unable to calculate',
    });
  }
  return formatUsd(estimatedCost);
};

const CostValue = ({
  period,
  group,
  testSubj,
}: {
  period: PeriodCost;
  group: BudgetGroupCost;
  testSubj: string;
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <span data-test-subj={testSubj}>
        {formatCostValue(group.totalTokens, group.estimatedCost)}
      </span>
    </EuiFlexItem>
    {group.status === 'partial' && group.estimatedCost !== null && (
      <EuiFlexItem grow={false}>
        <EuiBadge
          color="warning"
          data-test-subj={`nightshiftCostPartialBadge-${group.group}-${period.label}`}
        >
          {PARTIAL_FLOOR_LABEL}
        </EuiBadge>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

export const CostData = ({
  data,
  isRefreshing,
  onRefresh,
}: {
  data: CostResponse;
  isRefreshing: boolean;
  onRefresh: () => void;
}) => {
  const asOfTime = new Date(data.asOf).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const todayText = formatCostValue(data.today.totalTokens, data.today.totalEstimatedCost);
  const monthText = formatCostValue(data.month.totalTokens, data.month.totalEstimatedCost);
  const hasPartialNumericTotal =
    (data.today.totalStatus === 'partial' && data.today.totalEstimatedCost !== null) ||
    (data.month.totalStatus === 'partial' && data.month.totalEstimatedCost !== null);
  const headline = i18n.translate('xpack.nightshift.settings.costEstimate.headlineLabel', {
    defaultMessage: '{today} today · {month} this month (recorded calls)',
    values: { today: todayText, month: monthText },
  });

  const tableItems = useMemo(
    (): CostBreakdownRow[] =>
      COST_BUDGET_GROUPS.flatMap((groupName) => {
        const todayGroup = data.today.groups.find((group) => group.group === groupName);
        const monthGroup = data.month.groups.find((group) => group.group === groupName);
        if (!todayGroup || !monthGroup) {
          return [];
        }
        return [
          {
            group: groupName,
            groupLabel: GROUP_LABELS[groupName],
            todayGroup,
            monthGroup,
          },
        ];
      }),
    [data.month.groups, data.today.groups]
  );

  const tableColumns = useMemo(
    (): Array<EuiBasicTableColumn<CostBreakdownRow>> => [
      {
        field: 'groupLabel',
        name: i18n.translate('xpack.nightshift.settings.costEstimate.groupColumnTitle', {
          defaultMessage: 'Group',
        }),
        textOnly: true,
        render: (groupLabel: CostBreakdownRow['groupLabel']) => (
          <EuiText size="xs">{groupLabel}</EuiText>
        ),
      },
      {
        field: 'todayGroup',
        name: i18n.translate('xpack.nightshift.settings.costEstimate.todayColumnTitle', {
          defaultMessage: 'Today',
        }),
        textOnly: true,
        render: (todayGroup: BudgetGroupCost, item: CostBreakdownRow) => (
          <CostValue
            period={data.today}
            group={todayGroup}
            testSubj={`nightshiftCostGroupToday-${item.group}`}
          />
        ),
      },
      {
        field: 'monthGroup',
        name: i18n.translate('xpack.nightshift.settings.costEstimate.thisMonthColumnTitle', {
          defaultMessage: 'This month',
        }),
        textOnly: true,
        render: (monthGroup: BudgetGroupCost, item: CostBreakdownRow) => (
          <CostValue
            period={data.month}
            group={monthGroup}
            testSubj={`nightshiftCostGroupMonth-${item.group}`}
          />
        ),
      },
    ],
    [data.month, data.today]
  );

  return (
    <>
      <EuiText size="s">
        <p data-test-subj="nightshiftCostHeadline">
          {headline}
          {hasPartialNumericTotal ? (
            <>
              {' '}
              <EuiBadge color="warning" data-test-subj="nightshiftCostTotalPartialBadge">
                {PARTIAL_FLOOR_LABEL}
              </EuiBadge>
            </>
          ) : null}
        </p>
      </EuiText>
      <EuiText size="xs" color="subdued">
        <p data-test-subj="nightshiftCostAsOf">
          <FormattedMessage
            id="xpack.nightshift.settings.costEstimate.asOfLabel"
            defaultMessage="as of {asOf} at <pricingLink>current list prices</pricingLink>"
            values={{
              asOf: asOfTime,
              pricingLink: (chunks) => (
                <EuiLink
                  href={PRICING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  external
                  data-test-subj="nightshiftCostPricingLink"
                >
                  {chunks}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>

      <EuiSpacer />

      <EuiBasicTable
        compressed
        css={css`
          width: 100%;

          .euiTableRow:hover {
            background-color: transparent;
            cursor: default;
          }
        `}
        itemId="group"
        items={tableItems}
        columns={tableColumns}
        responsiveBreakpoint={false}
        rowHeader="firstColumn"
        rowProps={(item) => ({
          'data-test-subj': `nightshiftCostGroup-${item.group}`,
        })}
        tableCaption={i18n.translate('xpack.nightshift.settings.costEstimate.breakdownTableCaption', {
          defaultMessage: 'Inference cost by group for today and this month',
        })}
        tableLayout="fixed"
      />

      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="refresh"
            isLoading={isRefreshing}
            isDisabled={isRefreshing}
            onClick={onRefresh}
            data-test-subj="nightshiftCostRefreshButton"
          >
            {i18n.translate('xpack.nightshift.settings.costEstimate.refreshButtonLabel', {
              defaultMessage: 'Refresh',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
