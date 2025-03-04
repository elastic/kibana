/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { gapStatus } from '@kbn/alerting-plugin/common';
import { useGetRuleIdsWithGaps } from '../../api/hooks/use_get_rule_ids_with_gaps';
import { GapRangeValue } from '../../constants';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import * as i18n from './translations';

export const RuleGapsCallout = () => {
  const storeGapsInEventLogEnabled = useIsExperimentalFeatureEnabled('storeGapsInEventLogEnabled');

  const { data } = useGetRuleIdsWithGaps({
    gapRange: GapRangeValue.LAST_24_H,
    statuses: [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED],
  });

  if (!data || data?.total === 0 || !storeGapsInEventLogEnabled) {
    return null;
  }

  return (
    <>
      <EuiCallOut color="warning" title={i18n.RULE_GAPS_CALLOUT_TITLE} iconType="warning">
        <p>{i18n.RULE_GAPS_CALLOUT_MESSAGE}</p>
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  );
};
