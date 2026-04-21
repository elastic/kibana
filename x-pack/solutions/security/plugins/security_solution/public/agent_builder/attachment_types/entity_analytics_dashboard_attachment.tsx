/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type {
  AttachmentUIDefinition,
  AttachmentRenderProps,
  AttachmentServiceStartContract,
} from '@kbn/agent-builder-browser/attachments';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { APP_UI_ID, SecurityAgentBuilderAttachments } from '../../../common/constants';
import { EMPTY_SEVERITY_COUNT } from '../../../common/search_strategy';
import type { SeverityCount } from '../../entity_analytics/components/severity/types';
import { RiskLevelBreakdownTable } from '../../entity_analytics/components/home/risk_level_breakdown_table';
import { RiskScoreDonutChart } from '../../entity_analytics/components/risk_score_donut_chart';
import { EntityListTable, type EntityListRow } from './entity_list_attachment';
import {
  navigateToEntityAnalyticsHomePageInApp,
  type SecurityAgentBuilderChrome,
} from './entity_explore_navigation';

export type EntityAnalyticsDashboardAttachment = Attachment<
  typeof SecurityAgentBuilderAttachments.entityAnalyticsDashboard,
  {
    attachmentLabel?: string;
    summary?: string;
    time_range_label?: string;
    watchlist_id?: string;
    watchlist_name?: string;
    severity_count?: SeverityCount;
    distribution_note?: string;
    anomaly_highlights?: Array<{ title: string; body?: string }>;
    entities: EntityListRow[];
  }
>;

const rootCanvasStyles = css({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 400,
});

const mergeSeverityCount = (partial?: SeverityCount): SeverityCount => ({
  ...EMPTY_SEVERITY_COUNT,
  ...partial,
});

const EntityAnalyticsDashboardInlineContent: React.FC<
  AttachmentRenderProps<EntityAnalyticsDashboardAttachment>
> = ({ attachment }) => {
  const { entities, severity_count, attachmentLabel } = attachment.data;
  const title =
    attachmentLabel ??
    i18n.translate('xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.inlineTitle', {
      defaultMessage: 'Entity Analytics dashboard',
    });

  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder={false}>
      <EuiText size="xs">
        <strong>{title}</strong>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.inlineMeta', {
          defaultMessage:
            '{entityCount, plural, one {# entity in snapshot} other {# entities in snapshot}}{riskSuffix}',
          values: {
            entityCount: entities.length,
            riskSuffix: severity_count != null ? ' · Risk distribution included' : '',
          },
        })}
      </EuiText>
    </EuiPanel>
  );
};

const EntityAnalyticsDashboardCanvasContent: React.FC<
  AttachmentRenderProps<EntityAnalyticsDashboardAttachment> & {
    application: ApplicationStart;
    agentBuilder?: AgentBuilderPluginStart;
    chrome?: SecurityAgentBuilderChrome;
  }
> = ({ attachment, application, agentBuilder, chrome }) => {
  const data = attachment.data;
  const isXlScreen = useIsWithinBreakpoints(['l', 'xl']);
  const severityCount = mergeSeverityCount(data.severity_count);
  const hasSeverityPayload = data.severity_count != null;
  const title =
    data.attachmentLabel ??
    i18n.translate('xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.canvasTitle', {
      defaultMessage: 'Entity Analytics',
    });

  return (
    <div css={rootCanvasStyles}>
      <EuiPanel paddingSize="m" hasBorder css={{ overflow: 'auto' }}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={true}>
            <EuiTitle size="m">
              <h2>{title}</h2>
            </EuiTitle>
            {data.time_range_label ? (
              <>
                <EuiSpacer size="xs" />
                <EuiText size="s" color="subdued">
                  {data.time_range_label}
                </EuiText>
              </>
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="popout"
              onClick={() => {
                navigateToEntityAnalyticsHomePageInApp({
                  application,
                  appId: APP_UI_ID,
                  agentBuilder,
                  chrome,
                  watchlistId: data.watchlist_id,
                  watchlistName: data.watchlist_name,
                });
              }}
            >
              {i18n.translate(
                'xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.openInSecurity',
                {
                  defaultMessage: 'Open Entity Analytics in Security',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        {data.summary ? (
          <>
            <EuiSpacer size="m" />
            <EuiText size="s">
              <p>{data.summary}</p>
            </EuiText>
          </>
        ) : null}

        <EuiSpacer size="l" />

        <EuiFlexGroup direction={isXlScreen ? 'row' : 'column'} gutterSize="l" responsive={false}>
          <EuiFlexItem grow={1}>
            <EuiPanel hasBorder paddingSize="m">
              {hasSeverityPayload ? (
                <>
                  <EuiTitle size="s">
                    <h3>
                      <FormattedMessage
                        id="xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.riskLevelsTitle"
                        defaultMessage="Entity risk levels"
                      />
                    </h3>
                  </EuiTitle>
                  <EuiSpacer size="m" />
                  <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
                    <EuiFlexItem grow={4}>
                      <RiskLevelBreakdownTable severityCount={severityCount} loading={false} />
                    </EuiFlexItem>
                    <EuiFlexItem grow={1}>
                      <RiskScoreDonutChart showLegend={false} severityCount={severityCount} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  {data.distribution_note ? (
                    <>
                      <EuiSpacer size="s" />
                      <EuiText size="xs" color="subdued">
                        {data.distribution_note}
                      </EuiText>
                    </>
                  ) : null}
                </>
              ) : (
                <EuiCallOut
                  announceOnMount={false}
                  title={i18n.translate(
                    'xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.noRiskCountsTitle',
                    {
                      defaultMessage: 'Risk distribution not included in this snapshot',
                    }
                  )}
                  color="primary"
                  iconType="iInCircle"
                >
                  {i18n.translate(
                    'xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.noRiskCountsBody',
                    {
                      defaultMessage:
                        'Open Entity Analytics in Security for live KPIs, or ask the assistant to add severity_count when summarizing entities you retrieved.',
                    }
                  )}
                </EuiCallOut>
              )}
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem grow={2}>
            <EuiPanel hasBorder paddingSize="m">
              <EuiTitle size="s">
                <h3>
                  <FormattedMessage
                    id="xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.highlightsTitle"
                    defaultMessage="Recent anomalies and highlights"
                  />
                </h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              {data.anomaly_highlights?.length ? (
                <EuiFlexGroup direction="column" gutterSize="m">
                  {data.anomaly_highlights.map((item, idx) => (
                    <EuiFlexItem grow={false} key={`${idx}-${item.title}`}>
                      <EuiText size="s">
                        <strong>{item.title}</strong>
                      </EuiText>
                      {item.body ? (
                        <>
                          <EuiSpacer size="xs" />
                          <EuiText size="s" color="subdued">
                            {item.body}
                          </EuiText>
                        </>
                      ) : null}
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              ) : (
                <EuiText size="s" color="subdued">
                  {i18n.translate(
                    'xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.noHighlights',
                    {
                      defaultMessage:
                        'No highlights were attached. Ask for specific anomalies, watchlists, or entity types to populate this panel.',
                    }
                  )}
                </EuiText>
              )}
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <EuiPanel hasBorder paddingSize="m">
          <EuiTitle size="s">
            <h3>
              {data.watchlist_id ? (
                <FormattedMessage
                  id="xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.entitiesWithWatchlist"
                  defaultMessage="{watchlistName} entities"
                  values={{
                    watchlistName: data.watchlist_name ?? data.watchlist_id,
                  }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.entitiesTitle"
                  defaultMessage="Entities"
                />
              )}
            </h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          {data.entities.length ? (
            <EntityListTable
              entities={data.entities}
              application={application}
              agentBuilder={agentBuilder}
              chrome={chrome}
            />
          ) : (
            <EuiText size="s" color="subdued">
              {i18n.translate(
                'xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.emptyEntities',
                {
                  defaultMessage: 'No entities were included in this snapshot.',
                }
              )}
            </EuiText>
          )}
        </EuiPanel>
      </EuiPanel>
    </div>
  );
};

export const registerEntityAnalyticsDashboardAttachment = ({
  attachments,
  application,
  agentBuilder,
  chrome,
}: {
  attachments: AttachmentServiceStartContract;
  application: ApplicationStart;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
}): void => {
  attachments.addAttachmentType(
    SecurityAgentBuilderAttachments.entityAnalyticsDashboard,
    createEntityAnalyticsDashboardAttachmentDefinition({ application, agentBuilder, chrome })
  );
};

export const createEntityAnalyticsDashboardAttachmentDefinition = ({
  application,
  agentBuilder,
  chrome,
}: {
  application: ApplicationStart;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
}): AttachmentUIDefinition<EntityAnalyticsDashboardAttachment> => ({
  getLabel: (attachment) =>
    attachment.data.attachmentLabel ??
    i18n.translate('xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.pillLabel', {
      defaultMessage: 'Entity Analytics dashboard',
    }),
  getIcon: () => 'dashboardApp',
  renderInlineContent: (props) => <EntityAnalyticsDashboardInlineContent {...props} />,
  renderCanvasContent: (props) => (
    <EntityAnalyticsDashboardCanvasContent
      {...props}
      application={application}
      agentBuilder={agentBuilder}
      chrome={chrome}
    />
  ),
  getActionButtons: ({ openCanvas, isCanvas }) => {
    if (isCanvas || !openCanvas) {
      return [];
    }
    return [
      {
        label: i18n.translate(
          'xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.preview',
          {
            defaultMessage: 'Preview',
          }
        ),
        icon: 'eye',
        type: ActionButtonType.SECONDARY,
        handler: openCanvas,
      },
    ];
  },
});
