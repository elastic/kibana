/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiResizeObserver,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import type { EuiResizeObserverProps } from '@elastic/eui';
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
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ISessionService } from '@kbn/data-plugin/public';
import { APP_UI_ID, SecurityAgentBuilderAttachments } from '../../../common/constants';
import { EMPTY_SEVERITY_COUNT, RiskSeverity } from '../../../common/search_strategy';
import type { SeverityCount } from '../../entity_analytics/components/severity/types';
import { RiskLevelBreakdownTable } from '../../entity_analytics/components/home/risk_level_breakdown_table';
import { RiskScoreDonutChart } from '../../entity_analytics/components/risk_score_donut_chart';
import { EntityListTable, type EntityListRow } from './entity_list_table';
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

/**
 * Width (in px) below which the risk breakdown table and donut chart stack
 * vertically instead of sitting side-by-side. Chosen to avoid a cramped row
 * when the Canvas flyout / left column is narrow.
 */
const RISK_LEVEL_PANEL_STACK_WIDTH_THRESHOLD = 500;

/**
 * Preferred width for the Entity Analytics dashboard canvas. The layout has side-by-side
 * risk breakdown + donut + anomaly highlights panels, plus an entity list below, so it
 * benefits from as much width as the canvas flyout will allow. This matches the default
 * max (`50vw`) but is set explicitly to signal intent and survive any future change to
 * `DEFAULT_CANVAS_WIDTH`.
 */
const EA_DASHBOARD_CANVAS_WIDTH = '50vw';

const mergeSeverityCount = (partial?: SeverityCount): SeverityCount => ({
  ...EMPTY_SEVERITY_COUNT,
  ...partial,
});

const parseRiskLevelString = (raw?: string): RiskSeverity => {
  if (!raw) {
    return RiskSeverity.Unknown;
  }
  const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  const allowed = Object.values(RiskSeverity) as string[];
  if (allowed.includes(normalized)) {
    return normalized as RiskSeverity;
  }
  return RiskSeverity.Unknown;
};

const inferSeverityCountFromEntities = (entities: EntityListRow[]): SeverityCount => {
  const next: SeverityCount = { ...EMPTY_SEVERITY_COUNT };
  for (const row of entities) {
    const level = parseRiskLevelString(row.risk_level);
    next[level] += 1;
  }
  return next;
};

const severityTotal = (c: SeverityCount): number =>
  c[RiskSeverity.Critical] +
  c[RiskSeverity.High] +
  c[RiskSeverity.Moderate] +
  c[RiskSeverity.Low] +
  c[RiskSeverity.Unknown];

const EntityAnalyticsDashboardInlineContent: React.FC<
  AttachmentRenderProps<EntityAnalyticsDashboardAttachment>
> = ({ attachment }) => {
  const { entities, severity_count, attachmentLabel } = attachment.data;
  const title =
    attachmentLabel ??
    i18n.translate('xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.inlineTitle', {
      defaultMessage: 'Entity Analytics dashboard',
    });
  const showRiskInSnapshot =
    severity_count != null || severityTotal(inferSeverityCountFromEntities(entities ?? [])) > 0;

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
            entityCount: entities.length ?? 0,
            riskSuffix: showRiskInSnapshot ? ' · Risk chart from snapshot' : '',
          },
        })}
      </EuiText>
    </EuiPanel>
  );
};

const EntityAnalyticsDashboardCanvasContent: React.FC<
  AttachmentRenderProps<EntityAnalyticsDashboardAttachment> & {
    application: ApplicationStart;
    searchSession?: ISessionService;
    /**
     * Dismisses the canvas flyout. Provided by the Agent Builder canvas render
     * callbacks. Forwarded into `EntityListTable` so per-row navigation into
     * the Entity Analytics home flyout can close the overlay first, otherwise
     * the canvas renders on top of the just-opened entity flyout.
     */
    closeCanvas?: () => void;
  }
> = ({ attachment, application, searchSession, closeCanvas }) => {
  const data = attachment.data;
  const isXlScreen = useIsWithinBreakpoints(['l', 'xl']);
  const [isRiskPanelNarrow, setIsRiskPanelNarrow] = useState(false);
  const onRiskPanelResize = useCallback<EuiResizeObserverProps['onResize']>((dimensions) => {
    if (!dimensions) return;
    setIsRiskPanelNarrow(dimensions.width < RISK_LEVEL_PANEL_STACK_WIDTH_THRESHOLD);
  }, []);
  const hasExplicitSeverityCount = data.severity_count != null;
  const inferredFromEntities = useMemo(
    () => inferSeverityCountFromEntities(data.entities ?? []),
    [data.entities]
  );
  const severityCountForChart = useMemo(() => {
    if (hasExplicitSeverityCount) {
      return mergeSeverityCount(data.severity_count);
    }
    return severityTotal(inferredFromEntities) > 0
      ? inferredFromEntities
      : mergeSeverityCount(undefined);
  }, [data.severity_count, hasExplicitSeverityCount, inferredFromEntities]);

  const entityTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of data.entities ?? []) {
      const t = row.entity_type;
      counts[t] = (counts[t] ?? 0) + 1;
    }
    return counts;
  }, [data.entities]);

  const title =
    data.attachmentLabel ??
    i18n.translate('xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.canvasTitle', {
      defaultMessage: 'Entity Analytics',
    });

  return (
    <div css={rootCanvasStyles}>
      <EuiPanel paddingSize="m" hasShadow={false} hasBorder={false} css={{ overflow: 'auto' }}>
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
              <EuiTitle size="s">
                <h3>
                  {data.watchlist_id ? (
                    <FormattedMessage
                      id="xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.riskLevelsWatchlistTitle"
                      defaultMessage="{watchlistName} risk levels"
                      values={{
                        watchlistName: data.watchlist_name ?? data.watchlist_id,
                      }}
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.riskLevelsTitle"
                      defaultMessage="Entity risk levels"
                    />
                  )}
                </h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiResizeObserver onResize={onRiskPanelResize}>
                {(resizeRef) => (
                  <div ref={resizeRef}>
                    <EuiFlexGroup
                      alignItems={isRiskPanelNarrow ? 'stretch' : 'center'}
                      direction={isRiskPanelNarrow ? 'column' : 'row'}
                      gutterSize="l"
                      responsive={false}
                      data-test-subj="riskLevelPanelInnerRow"
                    >
                      <EuiFlexItem grow={4}>
                        <RiskLevelBreakdownTable
                          severityCount={severityCountForChart}
                          loading={false}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={1}>
                        <RiskScoreDonutChart
                          showLegend={false}
                          severityCount={severityCountForChart}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </div>
                )}
              </EuiResizeObserver>
              {data.distribution_note ? (
                <>
                  <EuiSpacer size="s" />
                  <EuiText size="xs" color="subdued">
                    {data.distribution_note}
                  </EuiText>
                </>
              ) : null}
              {!hasExplicitSeverityCount && severityTotal(inferredFromEntities) > 0 ? (
                <>
                  <EuiSpacer size="s" />
                  <EuiText size="xs" color="subdued">
                    {i18n.translate(
                      'xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.riskInferredFromEntities',
                      {
                        defaultMessage:
                          'Distribution is inferred from risk levels on the entities in this snapshot (not full-environment totals).',
                      }
                    )}
                  </EuiText>
                </>
              ) : null}
              {!hasExplicitSeverityCount && severityTotal(inferredFromEntities) === 0 ? (
                <>
                  <EuiSpacer size="s" />
                  <EuiText size="xs" color="subdued">
                    {i18n.translate(
                      'xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.riskNoDataHint',
                      {
                        defaultMessage:
                          'For totals that match the Security home page, ask the assistant to include severity_count from investigation, or open Entity Analytics in Security for live KPIs.',
                      }
                    )}
                  </EuiText>
                </>
              ) : null}
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
                <>
                  <EuiText size="s" color="subdued">
                    {i18n.translate(
                      'xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.noHighlightsIntro',
                      {
                        defaultMessage:
                          'This snapshot has no authored highlights yet. The full Entity Analytics home also includes:',
                      }
                    )}
                  </EuiText>
                  <EuiSpacer size="m" />
                  <EuiDescriptionList
                    type="responsiveColumn"
                    listItems={[
                      {
                        title: i18n.translate(
                          'xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.parityItemAnomalies',
                          {
                            defaultMessage: 'Anomaly detection',
                          }
                        ),
                        description: i18n.translate(
                          'xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.parityItemAnomaliesDesc',
                          {
                            defaultMessage:
                              'ML job timelines and recent anomalies scoped to your filters — live in Security only.',
                          }
                        ),
                      },
                      {
                        title: i18n.translate(
                          'xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.parityItemRiskByType',
                          {
                            defaultMessage: 'Risk scores by entity type',
                          }
                        ),
                        description: i18n.translate(
                          'xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.parityItemRiskByTypeDesc',
                          {
                            defaultMessage:
                              'Separate host, user, and service risk panels with tables — live in Security only.',
                          }
                        ),
                      },
                      {
                        title: i18n.translate(
                          'xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.parityItemLeads',
                          {
                            defaultMessage: 'Threat hunting leads',
                          }
                        ),
                        description: i18n.translate(
                          'xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.parityItemLeadsDesc',
                          {
                            defaultMessage:
                              'Optional lead generation strip when enabled — not part of this attachment.',
                          }
                        ),
                      },
                    ]}
                  />
                  <EuiSpacer size="m" />
                  <EuiText size="xs" color="subdued">
                    {i18n.translate(
                      'xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.noHighlightsAsk',
                      {
                        defaultMessage:
                          'Ask the assistant to populate anomaly_highlights, or use Open Entity Analytics in Security above.',
                      }
                    )}
                  </EuiText>
                </>
              )}
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        {Object.keys(entityTypeCounts).length > 0 ? (
          <>
            <EuiPanel hasBorder paddingSize="m">
              <EuiTitle size="s">
                <h3>
                  <FormattedMessage
                    id="xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.snapshotByTypeTitle"
                    defaultMessage="Entities in this snapshot by type"
                  />
                </h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiFlexGroup wrap responsive={false} gutterSize="m">
                {(['host', 'user', 'service', 'generic'] as const).map((type) => {
                  const count = entityTypeCounts[type] ?? 0;
                  if (count === 0) {
                    return null;
                  }
                  return (
                    <EuiFlexItem grow={false} key={type}>
                      <EuiStat
                        title={String(count)}
                        description={`${type.charAt(0).toUpperCase()}${type.slice(1)}`}
                        titleSize="m"
                        textAlign="left"
                      />
                    </EuiFlexItem>
                  );
                })}
              </EuiFlexGroup>
            </EuiPanel>
            <EuiSpacer size="l" />
          </>
        ) : null}

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
              searchSession={searchSession}
              closeCanvas={closeCanvas}
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
  searchSession,
}: {
  attachments: AttachmentServiceStartContract;
  application: ApplicationStart;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
  searchSession?: ISessionService;
}): void => {
  attachments.addAttachmentType(
    SecurityAgentBuilderAttachments.entityAnalyticsDashboard,
    createEntityAnalyticsDashboardAttachmentDefinition({
      application,
      agentBuilder,
      chrome,
      searchSession,
    })
  );
};

export const createEntityAnalyticsDashboardAttachmentDefinition = ({
  application,
  agentBuilder,
  chrome,
  searchSession,
}: {
  application: ApplicationStart;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
  searchSession?: ISessionService;
}): AttachmentUIDefinition<EntityAnalyticsDashboardAttachment> => ({
  getLabel: (attachment) =>
    attachment.data.attachmentLabel ??
    i18n.translate('xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.pillLabel', {
      defaultMessage: 'Entity Analytics dashboard',
    }),
  getIcon: () => 'dashboardApp',
  canvasWidth: EA_DASHBOARD_CANVAS_WIDTH,
  renderInlineContent: (props) => <EntityAnalyticsDashboardInlineContent {...props} />,
  renderCanvasContent: (props, { closeCanvas }) => (
    <EntityAnalyticsDashboardCanvasContent
      {...props}
      application={application}
      searchSession={searchSession}
      closeCanvas={closeCanvas}
    />
  ),
  getActionButtons: ({ attachment, openCanvas, isCanvas, openSidebarConversation }) => {
    if (isCanvas) {
      const data = attachment.data;
      return [
        {
          label: i18n.translate(
            'xpack.securitySolution.agentBuilder.entityAnalyticsDashboard.openInSecurity',
            {
              defaultMessage: 'Open Entity Analytics in Security',
            }
          ),
          icon: 'popout',
          type: ActionButtonType.SECONDARY,
          handler: () => {
            navigateToEntityAnalyticsHomePageInApp({
              application,
              appId: APP_UI_ID,
              agentBuilder,
              chrome,
              openSidebarConversation,
              watchlistId: data.watchlist_id,
              watchlistName: data.watchlist_name,
              searchSession,
            });
          },
        },
      ];
    }
    if (!openCanvas) {
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
