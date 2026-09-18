/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
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
  discovery: i18n.translate('xpack.significantEventsApp.settings.costEstimate.discoveryRowTitle', {
    defaultMessage: 'Discovery',
  }),
  investigation: i18n.translate(
    'xpack.significantEventsApp.settings.costEstimate.investigationRowTitle',
    { defaultMessage: 'Investigation' }
  ),
  ki_extraction: i18n.translate(
    'xpack.significantEventsApp.settings.costEstimate.kiExtractionRowTitle',
    { defaultMessage: 'KI extraction' }
  ),
  memory: i18n.translate('xpack.significantEventsApp.settings.costEstimate.memoryRowTitle', {
    defaultMessage: 'Memory',
  }),
};

const PARTIAL_FLOOR_LABEL = i18n.translate(
  'xpack.significantEventsApp.settings.costEstimate.partialFloorBadge',
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
    return i18n.translate('xpack.significantEventsApp.settings.costEstimate.noRecordedCallsLabel', {
      defaultMessage: 'No recorded calls',
    });
  }
  if (estimatedCost === null) {
    return i18n.translate(
      'xpack.significantEventsApp.settings.costEstimate.unableToCalculateLabel',
      { defaultMessage: 'Unable to calculate' }
    );
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
          data-test-subj={`significantEventsCostPartialBadge-${group.group}-${period.label}`}
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
  const headline = i18n.translate(
    'xpack.significantEventsApp.settings.costEstimate.headlineLabel',
    {
      defaultMessage: '{today} today · {month} this month (recorded calls)',
      values: { today: todayText, month: monthText },
    }
  );

  return (
    <>
      <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" gutterSize="m">
        <EuiFlexItem>
          <EuiText size="s">
            <p data-test-subj="significantEventsCostHeadline">
              {headline}
              {hasPartialNumericTotal ? (
                <>
                  {' '}
                  <EuiBadge color="warning" data-test-subj="significantEventsCostTotalPartialBadge">
                    {PARTIAL_FLOOR_LABEL}
                  </EuiBadge>
                </>
              ) : null}
            </p>
          </EuiText>
          <EuiText size="xs" color="subdued">
            <p data-test-subj="significantEventsCostAsOf">
              <FormattedMessage
                id="xpack.significantEventsApp.settings.costEstimate.asOfLabel"
                defaultMessage="as of {asOf} at <pricingLink>current list prices</pricingLink>"
                values={{
                  asOf: asOfTime,
                  pricingLink: (chunks) => (
                    <EuiLink
                      href={PRICING_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      external
                      data-test-subj="significantEventsCostPricingLink"
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
            data-test-subj="significantEventsCostRefreshButton"
          >
            {i18n.translate('xpack.significantEventsApp.settings.costEstimate.refreshButtonLabel', {
              defaultMessage: 'Refresh',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText size="xs">
            <strong>
              {i18n.translate('xpack.significantEventsApp.settings.costEstimate.groupColumnTitle', {
                defaultMessage: 'Group',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            <strong>
              {i18n.translate('xpack.significantEventsApp.settings.costEstimate.todayColumnTitle', {
                defaultMessage: 'Today',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            <strong>
              {i18n.translate(
                'xpack.significantEventsApp.settings.costEstimate.thisMonthColumnTitle',
                { defaultMessage: 'This month' }
              )}
            </strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {COST_BUDGET_GROUPS.map((groupName) => {
        const todayGroup = data.today.groups.find((group) => group.group === groupName);
        const monthGroup = data.month.groups.find((group) => group.group === groupName);
        if (!todayGroup || !monthGroup) {
          return null;
        }
        return (
          <EuiFlexGroup
            key={groupName}
            alignItems="center"
            data-test-subj={`significantEventsCostGroup-${groupName}`}
          >
            <EuiFlexItem>
              <EuiText size="s">{GROUP_LABELS[groupName]}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <CostValue
                period={data.today}
                group={todayGroup}
                testSubj={`significantEventsCostGroupToday-${groupName}`}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <CostValue
                period={data.month}
                group={monthGroup}
                testSubj={`significantEventsCostGroupMonth-${groupName}`}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      })}
    </>
  );
};
