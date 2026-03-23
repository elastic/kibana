/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EXCLUDE_COLD_AND_FROZEN_TIERS_IN_PREVALENCE } from '../../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import { usePrevalence } from '../hooks/use_prevalence';
import { PREVALENCE_TEST_ID } from './test_ids';
import { InsightsSummaryRow } from './insights_summary_row';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';

const UNCOMMON = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.document.insights.prevalence.uncommonLabel"
    defaultMessage="Uncommon"
  />
);
const TIME_RANGE_LABEL = (timeSavedInLocalStorage: boolean) => (
  <FormattedMessage
    id="xpack.securitySolution.flyout.document.insights.prevalence.timeRangeApplied.badgeLabel"
    defaultMessage="{state} range applied"
    values={{ state: timeSavedInLocalStorage ? 'Custom time' : 'Time' }}
  />
);
const TIME_RANGE_TOOLTIP = (timeSavedInLocalStorage: boolean) => (
  <FormattedMessage
    id="xpack.securitySolution.flyout.document.insights.prevalence.timeRangeApplied.tooltipLabel"
    defaultMessage="Prevalence measures how frequently data from this alert is observed across hosts or users in your environment over the {state}"
    values={{
      state: timeSavedInLocalStorage
        ? 'time range that you chose. To choose a different custom time range, click the section title, then use the date time picker in the left panel.'
        : 'last 30 days. To choose a custom time range, click the section title, then use the date time picker in the left panel.',
    }}
  />
);
const COLD_FROZEN_TIER_LABEL = (isColdAndFrozenTiersExcluded: boolean) => (
  <FormattedMessage
    id="xpack.securitySolution.flyout.document.insights.prevalence.coldAndFrozenTiers.badgeLabel"
    defaultMessage="Cold/Frozen tiers {state}"
    values={{ state: isColdAndFrozenTiersExcluded ? 'off' : 'on' }}
  />
);
const COLD_FROZEN_TIER_TOOLTIP = (isColdAndFrozenTiersExcluded: boolean) => (
  <FormattedMessage
    id="xpack.securitySolution.flyout.document.insights.prevalence.coldAndFrozenTiers.tooltipLabel"
    defaultMessage="{state}"
    values={{
      state: isColdAndFrozenTiersExcluded
        ? 'Cold and frozen tiers are excluded to improve performance. To include them, go to Advanced Settings or contact your administrator.'
        : 'This view loads more slowly because cold and frozen tiers are included. To change this, go to Advanced Settings or contact your administrator.',
    }}
  />
);

const PERCENTAGE_THRESHOLD = 0.1; // we show the prevalence if its value is below 10%
const DEFAULT_FROM = 'now-30d';
const DEFAULT_TO = 'now';

export interface PrevalenceOverviewProps {
  /**
   * Document record to display prevalence for
   */
  hit: DataTableRecord;
  /**
   * User defined fields to highlight (defined on the rule)
   */
  investigationFields: string[];
  /**
   * Whether to show the navigation icon
   */
  showIcon?: boolean;
  /**
   * Navigate to prevalence details
   */
  onShowPrevalenceDetails: () => void;
}

/**
 * Prevalence section under Insights section, overview tab.
 * The component fetches the necessary data at once. The loading and error states are handled by the ExpandablePanel component.
 */
export const PrevalenceOverview: FC<PrevalenceOverviewProps> = ({
  hit,
  investigationFields,
  showIcon = true,
  onShowPrevalenceDetails,
}) => {
  const { storage, uiSettings, serverless } = useKibana().services;
  const isServerless = !!serverless;
  const isColdAndFrozenTiersExcluded = uiSettings.get<boolean>(
    EXCLUDE_COLD_AND_FROZEN_TIERS_IN_PREVALENCE
  );
  const timeSavedInLocalStorage = storage.get(FLYOUT_STORAGE_KEYS.PREVALENCE_TIME_RANGE);

  const { loading, error, data } = usePrevalence({
    hit,
    investigationFields,
    interval: {
      from: timeSavedInLocalStorage?.start || DEFAULT_FROM,
      to: timeSavedInLocalStorage?.end || DEFAULT_TO,
    },
  });

  // only show data if the host prevalence is below 10%
  const uncommonData = useMemo(
    () =>
      data.filter(
        (d) =>
          isFinite(d.hostPrevalence) &&
          d.hostPrevalence > 0 &&
          d.hostPrevalence < PERCENTAGE_THRESHOLD
      ),
    [data]
  );

  const link = useMemo(
    () => ({
      callback: onShowPrevalenceDetails,
      tooltip: (
        <FormattedMessage
          id="xpack.securitySolution.flyout.document.insights.prevalence.prevalenceTooltip"
          defaultMessage="Show all prevalence"
        />
      ),
    }),
    [onShowPrevalenceDetails]
  );

  return (
    <ExpandablePanel
      header={{
        title: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.document.insights.prevalence.prevalenceTitle"
            defaultMessage="Prevalence"
          />
        ),
        link,
        iconType: showIcon ? 'arrowStart' : undefined,
        headerContent: (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            {!isServerless && (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={COLD_FROZEN_TIER_TOOLTIP(isColdAndFrozenTiersExcluded)}>
                  <EuiBadge color="hollow" iconSide="left" iconType="snowflake" tabIndex={0}>
                    {COLD_FROZEN_TIER_LABEL(isColdAndFrozenTiersExcluded)}
                  </EuiBadge>
                </EuiToolTip>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiToolTip content={TIME_RANGE_TOOLTIP(timeSavedInLocalStorage)}>
                <EuiBadge color="hollow" iconSide="left" iconType="clock" tabIndex={0}>
                  {TIME_RANGE_LABEL(timeSavedInLocalStorage)}
                </EuiBadge>
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      }}
      content={{ loading, error }}
      data-test-subj={PREVALENCE_TEST_ID}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        {uncommonData.length > 0 ? (
          uncommonData.map((d) => (
            <InsightsSummaryRow
              text={
                <>
                  {d.field}
                  {','} {d.values.toString()}
                </>
              }
              value={<EuiBadge color="warning">{UNCOMMON}</EuiBadge>}
              onShowDetails={onShowPrevalenceDetails}
              data-test-subj={`${PREVALENCE_TEST_ID}${d.field}`}
              key={`${PREVALENCE_TEST_ID}${d.field}`}
            />
          ))
        ) : (
          <FormattedMessage
            id="xpack.securitySolution.flyout.document.insights.prevalence.noDataDescription"
            defaultMessage="No prevalence data available."
          />
        )}
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};

PrevalenceOverview.displayName = 'PrevalenceOverview';
