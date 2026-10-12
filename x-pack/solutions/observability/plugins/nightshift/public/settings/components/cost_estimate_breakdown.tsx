/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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

interface CostTableRow {
  group: CostBudgetGroup;
  today: BudgetGroupCost;
  month: BudgetGroupCost;
}

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
  const items = COST_BUDGET_GROUPS.flatMap<CostTableRow>((group) => {
    const today = data.today.groups.find((item) => item.group === group);
    const month = data.month.groups.find((item) => item.group === group);
    return today && month ? [{ group, today, month }] : [];
  });
  const columns: Array<EuiBasicTableColumn<CostTableRow>> = [
    {
      field: 'group',
      name: i18n.translate('xpack.nightshift.settings.costEstimate.groupColumnTitle', {
        defaultMessage: 'Group',
      }),
      render: (group: CostBudgetGroup) => GROUP_LABELS[group],
    },
    {
      field: 'today',
      name: i18n.translate('xpack.nightshift.settings.costEstimate.todayColumnTitle', {
        defaultMessage: 'Today',
      }),
      render: (today: BudgetGroupCost) => (
        <CostValue
          period={data.today}
          group={today}
          testSubj={`nightshiftCostGroupToday-${today.group}`}
        />
      ),
    },
    {
      field: 'month',
      name: i18n.translate('xpack.nightshift.settings.costEstimate.thisMonthColumnTitle', {
        defaultMessage: 'This month',
      }),
      render: (month: BudgetGroupCost) => (
        <CostValue
          period={data.month}
          group={month}
          testSubj={`nightshiftCostGroupMonth-${month.group}`}
        />
      ),
    },
  ];

  return (
    <>
      <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" gutterSize="m">
        <EuiFlexItem>
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
        </EuiFlexItem>
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

      <EuiSpacer />
      <EuiBasicTable
        items={items}
        columns={columns}
        rowHeader="group"
        tableCaption={i18n.translate(
          'xpack.nightshift.settings.costEstimate.breakdownTableCaption',
          {
            defaultMessage: 'Inference cost estimate by activity group',
          }
        )}
        rowProps={({ group }: CostTableRow) => ({
          'data-test-subj': `nightshiftCostGroup-${group}`,
        })}
      />
    </>
  );
};
