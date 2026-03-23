/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { LeftPanelInsightsTab } from '../../left';
import { CORRELATIONS_TAB_ID } from '../../left/components/correlations_details';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';
import { CORRELATIONS_RELATED_CASES_TEST_ID } from './test_ids';
import { InsightsSummaryRow } from '../../../../flyout_v2/document/components/insights_summary_row';
import { useFetchRelatedCases } from '../../shared/hooks/use_fetch_related_cases';

export interface RelatedCasesProps {
  /**
   * Id of the document
   */
  eventId: string;
}

/**
 * Show related cases in summary row
 */
export const RelatedCases: React.VFC<RelatedCasesProps> = ({ eventId }) => {
  const { loading, error, dataCount } = useFetchRelatedCases({ eventId });

  const goToCorrelationsTab = useNavigateToLeftPanel({
    tab: LeftPanelInsightsTab,
    subTab: CORRELATIONS_TAB_ID,
  });

  const text = useMemo(
    () => (
      <FormattedMessage
        id="xpack.securitySolution.flyout.right.insights.correlations.relatedCasesLabel"
        defaultMessage="Related {count, plural, one {case} other {cases}}"
        values={{ count: dataCount }}
      />
    ),
    [dataCount]
  );

  return (
    <InsightsSummaryRow
      loading={loading}
      error={error}
      text={text}
      value={dataCount}
      onShowDetails={goToCorrelationsTab}
      data-test-subj={CORRELATIONS_RELATED_CASES_TEST_ID}
      key={`correlation-row-${text}`}
    />
  );
};

RelatedCases.displayName = 'RelatedCases';
