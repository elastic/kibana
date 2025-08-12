/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiCallOut,
  EuiSpacer,
  EuiButton,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiLink,
} from '@elastic/eui';
import { gapStatus } from '@kbn/alerting-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { useGetRuleIdsWithGaps } from '../../api/hooks/use_get_rule_ids_with_gaps';
import { GapRangeValue } from '../../constants';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../../common/lib/kibana';
import { SecurityPageName } from '../../../../../common/constants';
import { useGetSecuritySolutionUrl } from '../../../../common/components/link_to';
import { AllRulesTabs } from '../../../rule_management_ui/components/rules_table/rules_table_toolbar';
import {
  RULE_GAPS_CALLOUT_DASHBOARD,
  RULE_GAPS_CALLOUT_MONITORING_TAB,
  RULE_GAPS_CALLOUT_TITLE,
} from './translations';

const DISMISSAL_STORAGE_KEY = 'rule-gaps-callout-dismissed';

export const RuleGapsCallout = () => {
  const { docLinks, spaces } = useKibana().services;
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();

  const [spaceId, setSpaceId] = useState('');
  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => setSpaceId(space.id));
    }
  }, [spaces]);
  const storeGapsInEventLogEnabled = useIsExperimentalFeatureEnabled('storeGapsInEventLogEnabled');
  const [isDismissed, setIsDismissed] = useState(false);

  const { data } = useGetRuleIdsWithGaps({
    gapRange: GapRangeValue.LAST_24_H,
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
        title={RULE_GAPS_CALLOUT_TITLE}
        iconType="warning"
        onDismiss={handleDismiss}
      >
        <>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.ruleGaps.callout.message"
              defaultMessage="Gaps in rule executions might lead to missing alerts. Go to the Rule Monitoring tab to find affected rules and begin remediating gaps. {link}"
              values={{
                link: (
                  <EuiLink
                    href={docLinks.links.siem.gapsTable}
                    data-test-subj="monitoringLogsLink"
                    target="_blank"
                  >
                    {i18n.translate('xpack.securitySolution.ruleGaps.callout.messageLink', {
                      defaultMessage: 'Learn more',
                    })}
                  </EuiLink>
                ),
              }}
            />
          </p>
          <EuiFlexGroup>
            {spaceId && (
              <EuiButton
                href={getSecuritySolutionUrl({
                  deepLinkId: SecurityPageName.rules,
                  path: AllRulesTabs.monitoring,
                })}
                fill
                color="warning"
                size="s"
              >
                {RULE_GAPS_CALLOUT_MONITORING_TAB}
              </EuiButton>
            )}
            <EuiButtonEmpty
              href={getSecuritySolutionUrl({
                deepLinkId: SecurityPageName.dashboards,
                path: `security-detection-rule-monitoring-${spaceId}`,
              })}
              color="warning"
              size="s"
            >
              {RULE_GAPS_CALLOUT_DASHBOARD}
            </EuiButtonEmpty>
          </EuiFlexGroup>
        </>
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  );
};
