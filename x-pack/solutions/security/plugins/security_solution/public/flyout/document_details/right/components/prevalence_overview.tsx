/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { EuiBadge, EuiFlexGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFlyoutApi } from '@kbn/flyout';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { usePrevalence } from '../../shared/hooks/use_prevalence';
import { PREVALENCE_TEST_ID } from './test_ids';
import { useDocumentDetailsContext } from '../../shared/context';
import { InsightsSummaryRow } from './insights_summary_row';
import {
  DocumentDetailsInsightsPanelKey,
  DocumentDetailsRightPanelKey,
} from '../../shared/constants/panel_keys';
import { InsightsPanelPrevalenceTab } from '../../insights';

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
  const {
    dataFormattedForFieldBrowser,
    eventId,
    scopeId,
    indexName,
    investigationFields,
    isChild,
  } = useDocumentDetailsContext();

  const { openFlyout } = useFlyoutApi();
  const openEntitiesFlyout = useCallback(
    () =>
      openFlyout(
        {
          main: {
            id: DocumentDetailsInsightsPanelKey,
            path: InsightsPanelPrevalenceTab,
            params: {
              id: eventId,
              indexName,
              scopeId,
              isChild: false,
            },
          },
          child: {
            id: DocumentDetailsRightPanelKey,
            params: {
              id: eventId,
              indexName,
              scopeId,
              isChild: true,
              isPreview: false,
            },
          },
        },
        { mainSize: 'm' }
      ),
    [eventId, indexName, openFlyout, scopeId]
  );

  const { loading, error, data } = usePrevalence({
    dataFormattedForFieldBrowser,
    investigationFields,
    interval: {
      from: DEFAULT_FROM,
      to: DEFAULT_TO,
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
      callback: openEntitiesFlyout,
      tooltip: (
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.insights.prevalence.prevalenceTooltip"
          defaultMessage="Show all prevalence"
        />
      ),
    }),
    [openEntitiesFlyout]
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
        iconType: !isChild ? 'arrowStart' : undefined,
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
