/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ML_PAGES, useMlHref } from '@kbn/ml-plugin/public';
import {
  RecentAnomaliesChart,
  RECENT_ANOMALIES_QUERY_ID,
  RECENT_ANOMALIES_TIME_RANGE,
} from '../recent_anomalies/recent_anomalies_chart';
import { useKibana } from '../../../common/lib/kibana';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { InspectButton, InspectButtonContainer } from '../../../common/components/inspect';

const useRecentAnomaliesMlExplorerUrl = () => {
  // The Entity Analytics home page hides the global date picker; keep the
  // "Open in Anomaly Explorer" link aligned with the 30-day window used by
  // the recent anomalies chart instead of reading from the global time.
  const { from, to } = RECENT_ANOMALIES_TIME_RANGE;
  const { services } = useKibana();

  return useMlHref(
    services.ml,
    services.http.basePath.get(),
    {
      page: ML_PAGES.ANOMALY_EXPLORER,
      pageState: {
        timeRange: { from, to },
      },
    },
    [from, to]
  );
};

export const EntityAnalyticsRecentAnomalies: React.FC<{ watchlistId?: string }> = ({
  watchlistId,
}) => {
  const anomalyExplorerUrl = useRecentAnomaliesMlExplorerUrl();
  const spaceId = useSpaceId();
  return (
    <InspectButtonContainer>
      <EuiFlexItem data-test-subj="recent-anomalies-panel">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h3>
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.homePage.recentAnomalies"
                  defaultMessage="Recent anomalies"
                />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="none" alignItems="center">
              <EuiFlexItem grow={false}>
                <InspectButton
                  queryId={RECENT_ANOMALIES_QUERY_ID}
                  title={
                    <FormattedMessage
                      id="xpack.securitySolution.entityAnalytics.homePage.recentAnomalies"
                      defaultMessage="Recent anomalies"
                    />
                  }
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color={'primary'}
                  iconType={'popout'}
                  href={anomalyExplorerUrl}
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.homePage.recentAnomalies.viewAllInAnomalyExplorer"
                    defaultMessage="Open in Anomaly Explorer"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size={'m'} />
        <RecentAnomaliesChart watchlistId={watchlistId} spaceId={spaceId} />
      </EuiFlexItem>
    </InspectButtonContainer>
  );
};
