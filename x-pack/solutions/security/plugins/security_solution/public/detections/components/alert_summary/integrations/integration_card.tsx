/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { useIntegrationLastAlertIngested } from '../../../hooks/alert_summary/use_integration_last_alert_ingested';
import { IntegrationIcon } from '../common/integration_icon';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';

const LAST_SYNCED = i18n.translate(
  'xpack.securitySolution.alertSummary.integrations.lastSyncedLabel',
  {
    defaultMessage: 'Last synced: ',
  }
);

const MIN_WIDTH = 200;
const REFRESH_INTERVAL = 30000; // 30 seconds

export const LAST_ACTIVITY_LOADING_SKELETON_TEST_ID = '-last-activity-loading-skeleton';
export const LAST_ACTIVITY_VALUE_TEST_ID = '-last-activity-value';

export interface IntegrationProps {
  /**
   * Installed EASE integration
   */
  integration: PackageListItem;
  /**
   * Data test subject string for testing
   */
  ['data-test-subj']?: string;
}

/**
 * Rendered on the alert summary page. The card displays the icon, name and last time the integration received alert data.
 */
export const IntegrationCard = memo(
  ({ 'data-test-subj': dataTestSubj, integration }: IntegrationProps) => {
    const { euiTheme } = useEuiTheme();

    const { isLoading, lastAlertIngested, refetch } = useIntegrationLastAlertIngested({
      integrationName: integration.name,
    });

    // force a refresh every 30 seconds to update the last activity time
    useEffect(() => {
      const interval = setInterval(() => refetch(), REFRESH_INTERVAL);
      return () => clearInterval(interval);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <EuiPanel
        css={css`
          min-width: ${MIN_WIDTH}px;
        `}
        data-test-subj={dataTestSubj}
        hasBorder={true}
        hasShadow={false}
        paddingSize="s"
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <IntegrationIcon
              data-test-subj={dataTestSubj}
              iconSize="xl"
              integration={integration}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>
                <EuiText
                  css={css`
                    font-weight: ${euiTheme.font.weight.medium};
                  `}
                  size="xs"
                >
                  {integration.title}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSkeletonText
                  data-test-subj={`${dataTestSubj}${LAST_ACTIVITY_LOADING_SKELETON_TEST_ID}`}
                  isLoading={isLoading}
                  lines={1}
                  size="xs"
                >
                  <EuiText
                    color="subdued"
                    data-test-subj={`${dataTestSubj}${LAST_ACTIVITY_VALUE_TEST_ID}`}
                    size="xs"
                  >
                    {LAST_SYNCED}
                    <FormattedRelativePreferenceDate
                      value={lastAlertIngested}
                      /* we use key here to force re-render of the relative time */
                      key={Date.now()}
                    />
                  </EuiText>
                </EuiSkeletonText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

IntegrationCard.displayName = 'IntegrationCard';
