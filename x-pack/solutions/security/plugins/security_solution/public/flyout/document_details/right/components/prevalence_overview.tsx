/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
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

const PERCENTAGE_THRESHOLD = 0.1; // we show the prevalence if its value is below 10%
const DEFAULT_FROM = 'now-30d';
const DEFAULT_TO = 'now';

/**
 * Prevalence section under Insights section, overview tab.
 * The component fetches the necessary data at once. The loading and error states are handled by the ExpandablePanel component.
 */
export const PrevalenceOverview: FC = () => {
  const { storage } = useKibana().services;
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
          <EuiToolTip
            content={
              <FormattedMessage
                id="xpack.securitySolution.flyout.right.insights.prevalence.custom-time-range-applied-tooltip"
                defaultMessage="The prevalence is calculated from a specific time range. To change it, click on the Prevalence title (to the left) and use the date picker."
              />
            }
          >
            <EuiBadge color="hollow" iconSide="left" iconType="clock" tabIndex={0}>
              <FormattedMessage
                id="xpack.securitySolution.flyout.right.insights.prevalence.custom-time-range-applied-badge-label"
                defaultMessage="Time range applied"
              />
            </EuiBadge>
          </EuiToolTip>
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
