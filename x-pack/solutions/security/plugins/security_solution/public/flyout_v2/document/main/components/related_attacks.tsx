/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { InsightsSummaryRow } from './insights_summary_row';
import { CORRELATIONS_RELATED_ATTACKS_TEST_ID } from './test_ids';

export interface RelatedAttacksProps {
  /**
   * Values of the kibana.alert.attack_ids field
   */
  attackIds: string[];
  /**
   * Callback to navigate to correlations details
   */
  onShowCorrelationsDetails: () => void;
}

/**
 * Show related attacks count in summary row
 */
export const RelatedAttacks: React.VFC<RelatedAttacksProps> = ({
  attackIds,
  onShowCorrelationsDetails,
}) => {
  const count = attackIds.length;

  const text = useMemo(
    () => (
      <FormattedMessage
        id="xpack.securitySolution.flyout.document.insights.correlations.relatedAttacksLabel"
        defaultMessage="{count, plural, one {Attack} other {Attacks}} related to this alert"
        values={{ count }}
      />
    ),
    [count]
  );

  return (
    <InsightsSummaryRow
      text={text}
      value={count}
      onShowDetails={onShowCorrelationsDetails}
      data-test-subj={CORRELATIONS_RELATED_ATTACKS_TEST_ID}
      key={`correlation-row-${CORRELATIONS_RELATED_ATTACKS_TEST_ID}`}
    />
  );
};

RelatedAttacks.displayName = 'RelatedAttacks';
