/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
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
import { IntegrationIcon } from '../common/integration_icon';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';

const LAST_SYNCED = i18n.translate(
  'xpack.securitySolution.alertSummary.integrations.lastSyncedLabel',
  {
    defaultMessage: 'Last synced: ',
  }
);

const MIN_WIDTH = 200;

export const LAST_ACTIVITY_LOADING_SKELETON_TEST_ID = '-last-activity-loading-skeleton';
export const LAST_ACTIVITY_VALUE_TEST_ID = '-last-activity-value';

export interface IntegrationProps {
  /**
   * Installed AI for SOC integration
   */
  integration: PackageListItem;
  /**
   * True while retrieving data streams to provide the last activity value
   */
  isLoading: boolean;
  /**
   * Timestamp of the last time the integration synced (via data streams)
   */
  lastActivity: number | undefined;
  /**
   * Data test subject string for testing
   */
  ['data-test-subj']?: string;
}

/**
 * Rendered on the alert summary page. The card displays the icon, name and last sync value.
 */
export const IntegrationCard = memo(
  ({ 'data-test-subj': dataTestSubj, integration, isLoading, lastActivity }: IntegrationProps) => {
    const { euiTheme } = useEuiTheme();

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
                    <FormattedRelativePreferenceDate value={lastActivity} />
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
