/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { EuiBadge, EuiFlexGroup, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { useKibana } from '../../../common/lib/kibana';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import { useFetchThreatIntelligence } from '../hooks/use_fetch_threat_intelligence';
import { InsightsSummaryRow } from './insights_summary_row';
import {
  INSIGHTS_THREAT_INTELLIGENCE_ENRICHED_WITH_THREAT_INTELLIGENCE_TEST_ID,
  INSIGHTS_THREAT_INTELLIGENCE_TEST_ID,
  INSIGHTS_THREAT_INTELLIGENCE_THREAT_MATCHES_TEST_ID,
} from './test_ids';

const HEADER_TITLE = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.document.insights.threatIntelligence.threatIntelligenceTitle"
    defaultMessage="Threat intelligence"
  />
);
const HEADER_TOOLTIP = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.document.insights.threatIntelligence.threatIntelligenceTooltip"
    defaultMessage="Show all threat intelligence"
  />
);
const DEFAULT_TIME_RANGE_LABEL = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.document.insights.threatIntelligence.defaultTimeRangeApplied.badgeLabel"
    defaultMessage="Time range applied"
  />
);
const CUSTOM_TIME_RANGE_LABEL = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.document.insights.threatIntelligence.customTimeRangeApplied.badgeLabel"
    defaultMessage="Custom time range applied"
  />
);
const DEFAULT_TIME_RANGE_TOOLTIP = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.document.insights.threatIntelligence.defaultTimeRangeAppliedTooltipLabel"
    defaultMessage="Threat intelligence helps you to find current and emerging threats in your environment over the last 30 days. To choose a custom time range, click the section title, then use the date time picker in the left panel."
  />
);
const CUSTOM_TIME_RANGE_TOOLTIP = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.document.insights.threatIntelligence.customTimeRangeAppliedTooltipLabel"
    defaultMessage="Threat intelligence helps you to find current and emerging threats in your environment during the time range that you chose. To choose a different custom time range, click the section title, then use the date time picker in the left panel."
  />
);

/**
 * Threat intelligence section under Insights section, overview tab.
 * The component fetches the necessary data, then pass it down to the InsightsSubSection component for loading and error state,
 * and the SummaryPanel component for data rendering.
 */
export interface ThreatIntelligenceOverviewProps {
  /**
   * Document record used to retrieve threat intelligence data
   */
  hit: DataTableRecord;
  /**
   * Whether to show the navigation icon
   */
  showIcon?: boolean;
  /**
   * Callback to navigate to threat intelligence details
   */
  onShowThreatIntelligence: () => void;
}

export const ThreatIntelligenceOverview: FC<ThreatIntelligenceOverviewProps> = ({
  hit,
  showIcon = true,
  onShowThreatIntelligence,
}) => {
  const { storage } = useKibana().services;
  const timeSavedInLocalStorage = storage.get(FLYOUT_STORAGE_KEYS.THREAT_INTELLIGENCE_TIME_RANGE);

  const { loading, threatMatchesCount, threatEnrichmentsCount } = useFetchThreatIntelligence({
    hit,
  });

  const link = useMemo(
    () =>
      onShowThreatIntelligence
        ? {
            callback: onShowThreatIntelligence,
            tooltip: HEADER_TOOLTIP,
          }
        : undefined,
    [onShowThreatIntelligence]
  );

  const threatMatchCountText = useMemo(
    () => (
      <FormattedMessage
        id="xpack.securitySolution.flyout.document.insights.threatIntelligence.threatMatchDescription"
        defaultMessage="Threat {count, plural, one {match} other {matches}} detected"
        values={{ count: threatMatchesCount }}
      />
    ),
    [threatMatchesCount]
  );

  const threatEnrichmentsCountText = useMemo(
    () => (
      <FormattedMessage
        id="xpack.securitySolution.flyout.document.insights.threatIntelligence.threatEnrichmentDescription"
        defaultMessage="{count, plural, one {Field} other {Fields}} enriched with threat intelligence"
        values={{ count: threatEnrichmentsCount }}
      />
    ),
    [threatEnrichmentsCount]
  );

  return (
    <ExpandablePanel
      header={{
        title: HEADER_TITLE,
        link,
        iconType: showIcon ? 'arrowStart' : undefined,
        headerContent: (
          <EuiToolTip
            content={
              timeSavedInLocalStorage ? CUSTOM_TIME_RANGE_TOOLTIP : DEFAULT_TIME_RANGE_TOOLTIP
            }
          >
            <EuiBadge color="hollow" iconSide="left" iconType="clock" tabIndex={0}>
              {timeSavedInLocalStorage ? CUSTOM_TIME_RANGE_LABEL : DEFAULT_TIME_RANGE_LABEL}
            </EuiBadge>
          </EuiToolTip>
        ),
      }}
      data-test-subj={INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}
      content={{ loading }}
    >
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        data-test-subj={`${INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}Container`}
      >
        <InsightsSummaryRow
          text={threatMatchCountText}
          value={threatMatchesCount}
          onShowDetails={onShowThreatIntelligence}
          data-test-subj={INSIGHTS_THREAT_INTELLIGENCE_THREAT_MATCHES_TEST_ID}
        />
        <InsightsSummaryRow
          text={threatEnrichmentsCountText}
          value={threatEnrichmentsCount}
          onShowDetails={onShowThreatIntelligence}
          data-test-subj={INSIGHTS_THREAT_INTELLIGENCE_ENRICHED_WITH_THREAT_INTELLIGENCE_TEST_ID}
        />
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};

ThreatIntelligenceOverview.displayName = 'ThreatIntelligenceOverview';
