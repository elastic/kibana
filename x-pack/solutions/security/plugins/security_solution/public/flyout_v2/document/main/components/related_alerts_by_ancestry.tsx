/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFetchRelatedAlertsByAncestry } from '../hooks/use_fetch_related_alerts_by_ancestry';
import { InsightsSummaryRow } from './insights_summary_row';
import { CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_TEST_ID } from './test_ids';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';
import { sourcererSelectors } from '../../../../sourcerer/store';

export interface RelatedAlertsByAncestryProps {
  /**
   * Id of the document
   */
  documentId: string;
  /**
   * Callback to navigate to correlations details
   */
  onShowCorrelationsDetails: () => void;
}

/**
 * Show related alerts by ancestry in summary row
 */
export const RelatedAlertsByAncestry: React.VFC<RelatedAlertsByAncestryProps> = ({
  documentId,
  onShowCorrelationsDetails,
}) => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const oldSecurityDefaultPatterns =
    useSelector(sourcererSelectors.defaultDataView)?.patternList ?? [];
  const { indexPatterns: experimentalSecurityDefaultIndexPatterns } = useSecurityDefaultPatterns();
  const indices = newDataViewPickerEnabled
    ? experimentalSecurityDefaultIndexPatterns
    : oldSecurityDefaultPatterns;

  const { loading, error, dataCount } = useFetchRelatedAlertsByAncestry({
    documentId,
    indices,
  });

  const text = useMemo(
    () => (
      <FormattedMessage
        id="xpack.securitySolution.flyout.document.insights.correlations.ancestryAlertsLabel"
        defaultMessage="{count, plural, one {Alert} other {Alerts}} related by ancestry"
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
      onShowDetails={onShowCorrelationsDetails}
      data-test-subj={CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_TEST_ID}
      key={`correlation-row-${text}`}
    />
  );
};

RelatedAlertsByAncestry.displayName = 'RelatedAlertsByAncestry';
