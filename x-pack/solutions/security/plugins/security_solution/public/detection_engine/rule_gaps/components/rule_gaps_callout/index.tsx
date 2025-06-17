/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { gapStatus } from '@kbn/alerting-plugin/common';
import moment from 'moment';
import { useGetRuleIdsWithGaps } from '../../api/hooks/use_get_rule_ids_with_gaps';
import { GapRangeValue } from '../../constants';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import * as i18n from './translations';

const DISMISSAL_STORAGE_KEY = 'rule-gaps-callout-dismissed';

export const RuleGapsCallout = () => {
  const storeGapsInEventLogEnabled = useIsExperimentalFeatureEnabled('storeGapsInEventLogEnabled');
  const [isDismissed, setIsDismissed] = useState(false);

  const { data } = useGetRuleIdsWithGaps({
    gapRange: GapRangeValue.LAST_7_D,
    statuses: [gapStatus.UNFILLED, gapStatus.PARTIALLY_FILLED],
    hasUnfilledIntervals: true,
  });

  useEffect(() => {
    const checkDismissalStatus = () => {
      const dismissalData = localStorage.getItem(DISMISSAL_STORAGE_KEY);
      if (!dismissalData || !data?.latest_gap_timestamp) return;

      const { timestamp, latestGapTimestamp } = JSON.parse(dismissalData);
      const dismissalTime = moment(timestamp);
      const now = moment();

      // Show callout again if 24 hours passed or there's a newer gap
      const hasNewerGap =
        latestGapTimestamp && moment(data.latest_gap_timestamp).isAfter(moment(latestGapTimestamp));
      const isExpired = now.diff(dismissalTime, 'hours') >= 24;

      if (hasNewerGap || isExpired) {
        setIsDismissed(false);
        localStorage.removeItem(DISMISSAL_STORAGE_KEY);
      } else {
        setIsDismissed(true);
      }
    };

    checkDismissalStatus();
  }, [data?.latest_gap_timestamp]);

  const handleDismiss = useCallback(() => {
    const dismissalData = {
      timestamp: moment().toISOString(),
      latestGapTimestamp: data?.latest_gap_timestamp,
    };
    localStorage.setItem(DISMISSAL_STORAGE_KEY, JSON.stringify(dismissalData));
    setIsDismissed(true);
  }, [data?.latest_gap_timestamp]);

  if (!data || data?.total === 0 || !storeGapsInEventLogEnabled || isDismissed) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        color="warning"
        title={i18n.RULE_GAPS_CALLOUT_TITLE}
        iconType="warning"
        onDismiss={handleDismiss}
      >
        <p>{i18n.RULE_GAPS_CALLOUT_MESSAGE}</p>
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  );
};
