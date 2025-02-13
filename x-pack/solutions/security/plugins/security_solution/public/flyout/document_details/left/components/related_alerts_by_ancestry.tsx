/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { CorrelationsDetailsAlertsTable } from './correlations_details_alerts_table';
import { useFetchRelatedAlertsByAncestry } from '../../shared/hooks/use_fetch_related_alerts_by_ancestry';
import { CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID } from './test_ids';

export interface RelatedAlertsByAncestryProps {
  /**
   * Id of the document
   */
  documentId: string;
  /**
   * Values of the kibana.alert.rule.parameters.index field
   */
  indices: string[];
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
}

/**
 * Show related alerts by ancestry in an expandable panel with a table
 */
export const RelatedAlertsByAncestry: React.FC<RelatedAlertsByAncestryProps> = ({
  documentId,
  indices,
  scopeId,
}) => {
  const { loading, error, data, dataCount } = useFetchRelatedAlertsByAncestry({
    documentId,
    indices,
    scopeId,
  });

  if (error) {
    return null;
  }

  return (
    <CorrelationsDetailsAlertsTable
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.left.insights.correlations.ancestryAlertsTitle"
          defaultMessage="{count} {count, plural, one {alert} other {alerts}} related by ancestry"
          values={{ count: dataCount }}
        />
      }
      loading={loading}
      alertIds={data}
      scopeId={scopeId}
      eventId={documentId}
      noItemsMessage={
        <FormattedMessage
          id="xpack.securitySolution.flyout.left.insights.correlations.ancestryAlertsNoDataDescription"
          defaultMessage="No alerts related by ancestry."
        />
      }
      data-test-subj={CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID}
    />
  );
};

RelatedAlertsByAncestry.displayName = 'RelatedAlertsByAncestry';
