/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EXCLUDE_COLD_AND_FROZEN_TIERS_IN_PREVALENCE } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { usePrevalence } from '../../shared/hooks/use_prevalence';
import { PREVALENCE_TEST_ID } from './test_ids';
import { useDocumentDetailsContext } from '../../shared/context';
import { LeftPanelInsightsTab } from '../../left';
import { PREVALENCE_TAB_ID } from '../../left/components/prevalence_details';
import { InsightsSummaryRow } from './insights_summary_row';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';
import { FLYOUT_STORAGE_KEYS } from '../../shared/constants/local_storage';

const UNCOMMON = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.right.insights.prevalence.uncommonLabel"
    defaultMessage="Uncommon"
  />
);
const DEFAULT_TIME_RANGE_LABEL = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.right.insights.prevalence.defaultTimeRangeApplied.badgeLabel"
    defaultMessage="Time range applied"
  />
);
const CUSTOM_TIME_RANGE_LABEL = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.right.insights.prevalence.customTimeRangeApplied.badgeLabel"
    defaultMessage="Custom time range applied"
  />
);
const DEFAULT_TIME_RANGE_TOOLTIP = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.right.insights.prevalence.defaultTimeRangeApplied.tooltipLabel"
    defaultMessage="Prevalence measures how frequently data from this alert is observed across hosts or users in your environment over the last 30 days. To choose a custom time range, click the section title, then use the date time picker in the left panel."
  />
);
const CUSTOM_TIME_RANGE_TOOLTIP = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.right.insights.prevalence.customTimeRangeApplied.tooltipLabel"
    defaultMessage="Prevalence measures how frequently data from this alert is observed across hosts or users in your environment over the time range that you chose. To choose a different custom time range, click the section title, then use the date time picker in the left panel."
  />
);
const COLD_FROZEN_TIER_LABEL = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.right.insights.prevalence.excludeColdAndFrozenTiers.badgeLabel"
    defaultMessage="Cold/Frozen tiers excluded"
  />
);
const COLD_FROZEN_TIER_TOOLTIP = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.right.insights.prevalence.excludeColdAndFrozenTiers.tooltipLabel"
    defaultMessage="Cold and frozen tiers are currently excluded. To include them, go to Advanced Settings."
  />
);

const PERCENTAGE_THRESHOLD = 0.1; // we show the prevalence if its value is below 10%
const DEFAULT_FROM = 'now-30d';
const DEFAULT_TO = 'now';

/**
 * Prevalence section under Insights section, overview tab.
 * The component fetches the necessary data at once. The loading and error states are handled by the ExpandablePanel component.
 */
export const PrevalenceOverview: FC = () => {
  const { storage, uiSettings } = useKibana().services;
  const excludeColdAndFrozenTiers = uiSettings.get<boolean>(
    EXCLUDE_COLD_AND_FROZEN_TIERS_IN_PREVALENCE
  );
  const timeSavedInLocalStorage = storage.get(FLYOUT_STORAGE_KEYS.PREVALENCE_TIME_RANGE);

  const { dataFormattedForFieldBrowser, investigationFields, isPreviewMode } =
    useDocumentDetailsContext();

  const goToPrevalenceTab = useNavigateToLeftPanel({
    tab: LeftPanelInsightsTab,
    subTab: PREVALENCE_TAB_ID,
  });

  const { loading, error, data } = usePrevalence({
    dataFormattedForFieldBrowser,
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
      callback: goToPrevalenceTab,
      tooltip: (
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.insights.prevalence.prevalenceTooltip"
          defaultMessage="Show all prevalence"
        />
      ),
    }),
    [goToPrevalenceTab]
  );

  return (
    <ExpandablePanel
      header={{
        title: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.insights.prevalence.prevalenceTitle"
            defaultMessage="Prevalence"
          />
        ),
        link,
        iconType: !isPreviewMode ? 'arrowStart' : undefined,
        headerContent: (
          <EuiFlexGroup alignItems="center">
            {excludeColdAndFrozenTiers && (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={COLD_FROZEN_TIER_TOOLTIP}>
                  <EuiBadge color="hollow" iconSide="left" iconType="snowflake" tabIndex={0}>
                    {COLD_FROZEN_TIER_LABEL}
                  </EuiBadge>
                </EuiToolTip>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={
                  timeSavedInLocalStorage ? CUSTOM_TIME_RANGE_TOOLTIP : DEFAULT_TIME_RANGE_TOOLTIP
                }
              >
                <EuiBadge color="hollow" iconSide="left" iconType="clock">
                  {timeSavedInLocalStorage ? CUSTOM_TIME_RANGE_LABEL : DEFAULT_TIME_RANGE_LABEL}
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
              data-test-subj={`${PREVALENCE_TEST_ID}${d.field}`}
              key={`${PREVALENCE_TEST_ID}${d.field}`}
            />
          ))
        ) : (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.insights.prevalence.noDataDescription"
            defaultMessage="No prevalence data available."
          />
        )}
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};

PrevalenceOverview.displayName = 'PrevalenceOverview';
