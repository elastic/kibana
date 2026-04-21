/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiStat,
  EuiIcon,
  EuiSpacer,
  EuiButton,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useKibana } from '../../utils/kibana_react';
import { SignificantEventsDiscoveryIllustration } from './significant_events_discovery_illustration';

interface SystemSummary {
  status: 'healthy' | 'degraded' | 'critical';
  activeAlerts: number;
  services: { total: number; healthy: number; degraded: number };
  topIssue: string;
  lastUpdated: string;
}

const useDummySummaryData = (): SystemSummary => {
  return {
    status: 'degraded',
    activeAlerts: 12,
    services: { total: 47, healthy: 42, degraded: 5 },
    topIssue: 'High latency detected in payment-service (p99 > 2s)',
    lastUpdated: new Date().toISOString(),
  };
};

const SystemSummaryPanel: React.FC<{
  summary: SystemSummary;
  onAskAbout: (prompt: string) => void;
}> = ({ summary, onAskAbout }) => {
  const { euiTheme } = useEuiTheme();

  const statusColor =
    summary.status === 'healthy'
      ? euiTheme.colors.success
      : summary.status === 'degraded'
        ? euiTheme.colors.warning
        : euiTheme.colors.danger;

  const statusIcon =
    summary.status === 'healthy'
      ? 'checkInCircleFilled'
      : summary.status === 'degraded'
        ? 'warning'
        : 'error';

  return (
    <EuiPanel paddingSize="l">
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiIcon type={statusIcon} size="xl" color={statusColor} aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>
              {i18n.translate('xpack.observability.sigeventsOverview.summary.title', {
                defaultMessage: 'System Overview',
              })}
            </h3>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.observability.sigeventsOverview.summary.status', {
              defaultMessage: 'Status: {status}',
              values: { status: summary.status.toUpperCase() },
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiStat
            title={summary.activeAlerts}
            description={i18n.translate(
              'xpack.observability.sigeventsOverview.summary.activeAlerts',
              { defaultMessage: 'Active Alerts' }
            )}
            titleColor={summary.activeAlerts > 0 ? 'danger' : 'default'}
            titleSize="m"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={`${summary.services.healthy}/${summary.services.total}`}
            description={i18n.translate(
              'xpack.observability.sigeventsOverview.summary.healthyServices',
              { defaultMessage: 'Healthy Services' }
            )}
            titleColor={summary.services.degraded > 0 ? 'warning' : 'success'}
            titleSize="m"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {summary.topIssue && (
        <>
          <EuiSpacer size="m" />
          <EuiPanel color="warning" paddingSize="s">
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('xpack.observability.sigeventsOverview.summary.topIssue', {
                      defaultMessage: 'Top Issue:',
                    })}
                  </strong>{' '}
                  {summary.topIssue}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="o11ySystemSummaryPanelAskAboutThisButton"
                  size="s"
                  onClick={() => onAskAbout(`Tell me more about: ${summary.topIssue}`)}
                >
                  {i18n.translate('xpack.observability.sigeventsOverview.summary.askAbout', {
                    defaultMessage: 'Ask about this',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </>
      )}
    </EuiPanel>
  );
};

export function SigeventsOverviewPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const { services } = useKibana();
  const { agentBuilder } = services;

  const summaryData = useDummySummaryData();
  const [initialMessage, setInitialMessage] = useState<string | undefined>();

  const EmbeddableConversation = useMemo(
    () => agentBuilder?.getEmbeddableConversation(),
    [agentBuilder]
  );

  const handleAskAbout = (prompt: string) => {
    setInitialMessage(prompt);
  };

  const attachments = useMemo(
    () => [
      {
        id: 'system-summary',
        type: 'text' as const,
        getContent: async () => ({
          content: `Current system summary:\n${JSON.stringify(summaryData, null, 2)}`,
        }),
      },
    ],
    [summaryData]
  );

  const containerStyles = css`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    height: 100%;
    min-height: 0;
    gap: 16px;
  `;

  const chatContainerStyles = css`
    flex-grow: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  `;

  return (
    <ObservabilityPageTemplate
      isPageDataLoaded={true}
      data-test-subj="obltSigeventsOverviewPageHeader"
      pageSectionProps={{
        grow: true,
        contentProps: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
          },
        },
      }}
    >
      <div css={containerStyles} data-test-subj="obltSigeventsConversation">
        <EuiFlexGroup alignItems="center" justifyContent="center" direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiEmptyPrompt
              hasShadow
              color="plain"
              icon={<SignificantEventsDiscoveryIllustration />}
              data-test-subj="obltSigeventsOverviewPlaceholder"
              title={
                <h2>
                  {i18n.translate('xpack.observability.sigeventsOverview.emptyState.title', {
                    defaultMessage: 'Observability Status page',
                  })}
                </h2>
              }
              body={
                <p>
                  {i18n.translate('xpack.observability.sigeventsOverview.emptyState.body', {
                    defaultMessage:
                      'This page will show status, active significant events, impacted entities and other related information. It will also allow for a conversation with context.',
                  })}
                </p>
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <SystemSummaryPanel summary={summaryData} onAskAbout={handleAskAbout} />

        {EmbeddableConversation && (
          <div css={chatContainerStyles}>
            <EmbeddableConversation
              sessionTag="sigevents"
              initialMessage={initialMessage}
              attachments={attachments}
            />
          </div>
        )}
      </div>
    </ObservabilityPageTemplate>
  );
}
