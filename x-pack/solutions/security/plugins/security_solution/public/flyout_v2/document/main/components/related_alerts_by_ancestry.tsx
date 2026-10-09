/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFetchRelatedAlertsByAncestry } from '../hooks/use_fetch_related_alerts_by_ancestry';
import { InsightsSummaryRow } from './insights_summary_row';
import { CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_TEST_ID } from './test_ids';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';
import { useKibana } from '../../../../common/lib/kibana';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';

const DEFAULT_FROM = 'now-1d';
const DEFAULT_TO = 'now';

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
  const { storage } = useKibana().services;
  const { indexPatterns } = useSecurityDefaultPatterns();

  // This reads the same time range persisted by the Correlations tab's date picker
  // (see flyout_v2/document/tools/correlations/components/related_alerts_by_ancestry.tsx),
  // so this summary row stays bounded without rendering its own picker.
  const timeSavedInLocalStorage = storage.get(FLYOUT_STORAGE_KEYS.ANCESTRY_ALERTS_TIME_RANGE);

  const { loading, error, dataCount } = useFetchRelatedAlertsByAncestry({
    documentId,
    indices: indexPatterns,
    interval: {
      from: timeSavedInLocalStorage?.start || DEFAULT_FROM,
      to: timeSavedInLocalStorage?.end || DEFAULT_TO,
    },
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
