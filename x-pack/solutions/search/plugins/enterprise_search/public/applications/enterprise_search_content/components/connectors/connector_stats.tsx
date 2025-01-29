/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { css } from '@emotion/react';
import { useActions, useValues } from 'kea';

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FetchSyncJobsStatsApiLogic } from '../../api/stats/fetch_sync_jobs_stats_api_logic';

import {
  getConnectedConnectorsBadgeLabel,
  getConnectedConnectorsTooltipContent,
  getConnectedBadgeAriaLabel,
  getIncompleteConnectorsBadgeLabel,
  getIncompleteConnectorBadgeAriaLabel,
  getIncompleteConnectorsTooltip,
  getIdleJobsLabel,
  getIdleJobsTooltip,
  getOrphanedJobsLabel,
  getOrphanedJobsTooltip,
  getRunningJobsBadgeAriaLabel,
  getRunningJobsBadgeLabel,
  getRunningJobsLabel,
  getRunningJobsTooltip,
  getSyncJobErrorsLabel,
  getSyncJobErrorsTooltip,
} from './utils';

export interface ConnectorStatsProps {
  isCrawler: boolean;
}

export const ConnectorStats: React.FC<ConnectorStatsProps> = ({ isCrawler }) => {
  const { euiTheme } = useEuiTheme();

  const tooltipAncherProps = {
    css: css`
      margin: ${euiTheme.size.xs};
    `,
  };
  const { makeRequest } = useActions(FetchSyncJobsStatsApiLogic);
  const { data } = useValues(FetchSyncJobsStatsApiLogic);

  const connectorCount = (data?.connected || 0) + (data?.incomplete || 0);
  const hasMultipleConnectors = connectorCount > 1;
  const connectedCount = data?.connected || 0;
  const incompleteCount = data?.incomplete || 0;
  const inProgressCount = data?.in_progress || 0;
  const idleCount = data?.idle || 0;
  const orphanedCount = data?.orphaned_jobs || 0;
  const errorCount = data?.errors || 0;

  useEffect(() => {
    makeRequest({ isCrawler });
  }, []);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiSplitPanel.Outer hasShadow={false} hasBorder>
          <EuiSplitPanel.Inner>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiTitle size="xxxs">
                  <h4>
                    {!isCrawler
                      ? i18n.translate(
                          'xpack.enterpriseSearch.connectorStats.h4.connectorSummaryLabel',
                          { defaultMessage: 'Connector summary' }
                        )
                      : i18n.translate(
                          'xpack.enterpriseSearch.connectorStats.h4.crawlerSummaryLabel',
                          { defaultMessage: 'Web crawler summary' }
                        )}
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText>
                  {!isCrawler
                    ? hasMultipleConnectors
                      ? i18n.translate(
                          'xpack.enterpriseSearch.connectorStats.multipleConnectorsText',
                          {
                            defaultMessage: '{count} connectors',
                            values: { count: connectorCount },
                          }
                        )
                      : i18n.translate(
                          'xpack.enterpriseSearch.connectorStats.singleConnectorText',
                          {
                            defaultMessage: '{count} connector',
                            values: { count: connectorCount },
                          }
                        )
                    : hasMultipleConnectors
                    ? i18n.translate('xpack.enterpriseSearch.connectorStats.multipleCrawlersText', {
                        defaultMessage: '{count} web crawlers',
                        values: { count: connectorCount },
                      })
                    : i18n.translate('xpack.enterpriseSearch.connectorStats.singleCrawlerText', {
                        defaultMessage: '{count} web crawler',
                        values: { count: connectorCount },
                      })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiSplitPanel.Inner>

          <EuiSplitPanel.Inner grow={false} color="subdued">
            <EuiToolTip
              anchorProps={tooltipAncherProps}
              content={getConnectedConnectorsTooltipContent(connectedCount, isCrawler)}
            >
              <EuiBadge
                color="success"
                onClick={() => {}}
                onClickAriaLabel={getConnectedBadgeAriaLabel(connectedCount)}
              >
                {getConnectedConnectorsBadgeLabel(connectedCount)}
              </EuiBadge>
            </EuiToolTip>

            <EuiToolTip
              anchorProps={tooltipAncherProps}
              content={getIncompleteConnectorsTooltip(incompleteCount, isCrawler)}
            >
              <EuiBadge
                color="warning"
                onClick={() => {}}
                onClickAriaLabel={getIncompleteConnectorBadgeAriaLabel(incompleteCount)}
              >
                {getIncompleteConnectorsBadgeLabel(incompleteCount)}
              </EuiBadge>
            </EuiToolTip>
          </EuiSplitPanel.Inner>
        </EuiSplitPanel.Outer>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSplitPanel.Outer hasShadow={false} hasBorder>
          <EuiSplitPanel.Inner>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiTitle size="xxxs">
                  <h4>
                    {i18n.translate('xpack.enterpriseSearch.connectorStats.h4.syncsStatusLabel', {
                      defaultMessage: 'Syncs status',
                    })}
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText>{getRunningJobsLabel(inProgressCount, isCrawler)}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiSplitPanel.Inner>

          <EuiSplitPanel.Inner grow={false} color="subdued">
            <EuiToolTip
              anchorProps={tooltipAncherProps}
              content={getRunningJobsTooltip(inProgressCount, isCrawler)}
            >
              <EuiBadge
                onClick={() => {}}
                onClickAriaLabel={getRunningJobsBadgeAriaLabel(inProgressCount, isCrawler)}
              >
                {getRunningJobsBadgeLabel(inProgressCount, isCrawler)}
              </EuiBadge>
            </EuiToolTip>

            {!isCrawler && (
              <EuiToolTip anchorProps={tooltipAncherProps} content={getIdleJobsTooltip(idleCount)}>
                <EuiBadge onClick={() => {}} onClickAriaLabel={getIdleJobsLabel(idleCount)}>
                  {getIdleJobsLabel(idleCount)}
                </EuiBadge>
              </EuiToolTip>
            )}

            <EuiToolTip
              anchorProps={tooltipAncherProps}
              content={getOrphanedJobsTooltip(orphanedCount, isCrawler)}
            >
              <EuiBadge
                onClick={() => {}}
                onClickAriaLabel={getOrphanedJobsLabel(orphanedCount, isCrawler)}
              >
                {getOrphanedJobsLabel(orphanedCount, isCrawler)}
              </EuiBadge>
            </EuiToolTip>

            <EuiToolTip
              anchorProps={tooltipAncherProps}
              content={getSyncJobErrorsTooltip(errorCount, isCrawler)}
            >
              <EuiBadge
                onClick={() => {}}
                onClickAriaLabel={getSyncJobErrorsLabel(errorCount, isCrawler)}
                color={errorCount > 0 ? 'danger' : 'default'}
              >
                {getSyncJobErrorsLabel(errorCount, isCrawler)}
              </EuiBadge>
            </EuiToolTip>
          </EuiSplitPanel.Inner>
        </EuiSplitPanel.Outer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
