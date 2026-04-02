/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonGroup,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  logicalCSS,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { useFetchEpisodeEventsQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_events_query';
import { RELATED_ALERT_EPISODES_PAGE_SIZE } from '@kbn/alerting-v2-episodes-ui/constants';
import { RelatedAlertEpisode } from '@kbn/alerting-v2-episodes-ui/components/related/related_alert_episode';
import { useFetchEpisodeActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_actions';
import { useFetchGroupActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_group_actions';
import { useFetchRelatedAlertEpisodesQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_related_alert_episodes_query';
import { useFetchRule } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_rule_http';
import {
  getEpisodeDurationMs,
  getGroupHashFromEpisodeRows,
  getLastEpisodeStatus,
  getRuleIdFromEpisodeRows,
  getTriggeredTimestamp,
} from '@kbn/alerting-v2-episodes-ui/utils/episode_series_derived';
import { AlertEpisodeActions } from '@kbn/alerting-v2-episodes-ui/components/actions/actions';
import { AlertEpisodeTags } from '@kbn/alerting-v2-episodes-ui/components/actions/tags';
import { AlertEpisodeGroupingFields } from '@kbn/alerting-v2-episodes-ui/components/grouping/grouping_fields';
import { AlertEpisodeStatusBadges } from '@kbn/alerting-v2-episodes-ui/components/status/status_badges';
import { css } from '@emotion/react';
import { useHistory, useParams } from 'react-router-dom';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';
import { paths } from '../../../common/locators/paths';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useKibana } from '../../utils/kibana_react';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import PageNotFound from '../404';
import { EpisodeLifecycleHeatmap } from './components/episode_lifecycle_heatmap';

const episodeDetailsBreadcrumbFallback = i18n.translate(
  'xpack.observability.breadcrumbs.episodeDetailsFallback',
  {
    defaultMessage: 'Episode',
  }
);

function formatDurationMs(ms: number): string {
  if (ms < 1000) {
    return i18n.translate('xpack.observability.episodeDetails.durationMs', {
      defaultMessage: '{ms} ms',
      values: { ms: Math.round(ms) },
    });
  }
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return i18n.translate('xpack.observability.episodeDetails.durationDays', {
      defaultMessage: '{days} d',
      values: { days },
    });
  }
  if (hours > 0) {
    return i18n.translate('xpack.observability.episodeDetails.durationHours', {
      defaultMessage: '{hours} h',
      values: { hours },
    });
  }
  if (minutes > 0) {
    return i18n.translate('xpack.observability.episodeDetails.durationMinutes', {
      defaultMessage: '{minutes} min',
      values: { minutes },
    });
  }
  return i18n.translate('xpack.observability.episodeDetails.durationSeconds', {
    defaultMessage: '{seconds} s',
    values: { seconds },
  });
}

function formatRuleEvaluationEsql(rule: RuleResponse): string {
  const base = rule.evaluation.query.base;
  const condition = rule.evaluation.query.condition?.trim();
  if (!condition) {
    return base;
  }
  if (condition.startsWith('|')) {
    return `${base}\n${condition}`;
  }
  return `${base}\n| ${condition}`;
}

interface EpisodeRouteParams {
  episodeId: string;
}

type EpisodeDetailsSidebarPanel = 'episode_details' | 'runbook';

export function EpisodeDetailsPage() {
  const { episodeId } = useParams<EpisodeRouteParams>();
  const [sidebarPanel, setSidebarPanel] = useState<EpisodeDetailsSidebarPanel>('episode_details');
  const history = useHistory();
  const { ObservabilityPageTemplate } = usePluginContext();
  const { services } = useKibana();
  const { euiTheme } = useEuiTheme();
  const { data, notifications, http, serverless, expressions } = services;

  const { data: eventRows = [], isLoading: isLoadingEvents } = useFetchEpisodeEventsQuery({
    episodeId,
    data,
  });

  const ruleId = useMemo(() => getRuleIdFromEpisodeRows(eventRows), [eventRows]);
  const groupHash = useMemo(() => getGroupHashFromEpisodeRows(eventRows), [eventRows]);

  const { data: rule, isLoading: isLoadingRule } = useFetchRule({
    http,
    ruleId,
    toastDanger: (message) => notifications.toasts.addDanger(message),
  });

  const { data: episodeActionsMap } = useFetchEpisodeActions({
    episodeIds: episodeId ? [episodeId] : [],
    services,
  });

  const { data: groupActionsMap } = useFetchGroupActions({
    groupHashes: groupHash ? [groupHash] : [],
    services,
  });

  const { data: relatedEpisodesResult, isLoading: isLoadingRelatedEpisodes } =
    useFetchRelatedAlertEpisodesQuery({
      ruleId,
      excludeEpisodeId: episodeId,
      pageSize: RELATED_ALERT_EPISODES_PAGE_SIZE,
      services: { ...services, expressions },
      toastDanger: (message) => notifications.toasts.addDanger(message),
    });

  const relatedEpisodeRows = useMemo(
    () => relatedEpisodesResult?.rows ?? [],
    [relatedEpisodesResult?.rows]
  );

  const relatedEpisodeIds = useMemo(
    () =>
      relatedEpisodeRows
        .map((row) => row['episode.id'] as string | undefined)
        .filter((id): id is string => Boolean(id)),
    [relatedEpisodeRows]
  );

  const relatedGroupHashes = useMemo(
    () => [
      ...new Set(
        relatedEpisodeRows
          .map((row) => row.group_hash as string | undefined)
          .filter((hash): hash is string => Boolean(hash))
      ),
    ],
    [relatedEpisodeRows]
  );

  const { data: relatedEpisodeActionsMap } = useFetchEpisodeActions({
    episodeIds: relatedEpisodeIds,
    services: { expressions },
  });

  const { data: relatedGroupActionsMap } = useFetchGroupActions({
    groupHashes: relatedGroupHashes,
    services: { expressions },
  });

  const episodeBreadcrumbTitle =
    rule?.metadata.name != null && rule.metadata.name.length > 0
      ? rule.metadata.name
      : episodeDetailsBreadcrumbFallback;

  useBreadcrumbs(
    [
      {
        href: http.basePath.prepend(paths.observability.alertingV2),
        text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
          defaultMessage: 'Alerts',
        }),
        deepLinkId: 'observability-overview:alerts_v2',
      },
      {
        text: episodeBreadcrumbTitle,
      },
    ],
    { serverless }
  );

  const episodeAction = episodeId ? episodeActionsMap?.get(episodeId) : undefined;
  const groupAction = groupHash ? groupActionsMap?.get(groupHash) : undefined;
  const tags = groupAction?.tags ?? [];

  const lastStatus = useMemo(() => getLastEpisodeStatus(eventRows), [eventRows]);
  const triggeredAt = useMemo(() => getTriggeredTimestamp(eventRows), [eventRows]);
  const durationMs = useMemo(() => getEpisodeDurationMs(eventRows), [eventRows]);

  const runbookArtifact = useMemo(
    () => rule?.artifacts?.find((artifact) => artifact.type === 'runbook'),
    [rule?.artifacts]
  );

  const ruleOverviewEsql = useMemo(() => (rule ? formatRuleEvaluationEsql(rule) : ''), [rule]);

  const ruleKindLabel =
    rule?.kind === 'signal'
      ? i18n.translate('xpack.observability.episodeDetails.ruleKindSignal', {
          defaultMessage: 'Signal',
        })
      : i18n.translate('xpack.observability.episodeDetails.ruleKindAlerting', {
          defaultMessage: 'Alerting',
        });

  const isLoading = isLoadingEvents || (Boolean(ruleId) && isLoadingRule);

  if (!episodeId) {
    return <PageNotFound />;
  }

  const pageTitle = (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={true}
      wrap
      justifyContent="spaceBetween"
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1 data-test-subj="observabilityEpisodeDetailsRuleTitle">
              {rule?.metadata.name ??
                i18n.translate('xpack.observability.episodeDetails.loadingRuleTitle', {
                  defaultMessage: 'Episode details',
                })}
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        {lastStatus ? (
          <EuiFlexItem grow={false}>
            <AlertEpisodeStatusBadges
              status={lastStatus}
              episodeAction={episodeAction}
              groupAction={groupAction}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <AlertEpisodeActions
          episodeId={episodeId}
          groupHash={groupHash}
          episodeAction={episodeAction}
          groupAction={groupAction}
          http={http}
          buttonsOutlined={false}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const ruleDescriptionText =
    rule?.metadata.description != null && rule.metadata.description.length > 0 ? (
      <EuiText size="s" color="subdued">
        {rule.metadata.description}
      </EuiText>
    ) : null;

  const showTagsInHeader = !isLoading && tags.length > 0;
  const tagsInHeader = showTagsInHeader ? (
    <div data-test-subj="observabilityEpisodeDetailsHeaderTags">
      <AlertEpisodeTags tags={tags} />
    </div>
  ) : null;

  const description =
    tagsInHeader || ruleDescriptionText ? (
      <>
        {ruleDescriptionText}
        {tagsInHeader && ruleDescriptionText ? <EuiSpacer size="s" /> : null}
        {tagsInHeader}
      </>
    ) : undefined;

  const episodeDetailsSidebarTitle = i18n.translate(
    'xpack.observability.episodeDetails.sidebarTitle',
    {
      defaultMessage: 'Episode details',
    }
  );

  const runbookSidebarTitle = i18n.translate('xpack.observability.episodeDetails.runbookTitle', {
    defaultMessage: 'Runbook',
  });

  const sidebarHeaderTitle =
    sidebarPanel === 'episode_details' ? episodeDetailsSidebarTitle : runbookSidebarTitle;

  const sidebar = (
    <>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        gutterSize="s"
        css={css`
          flex-grow: 0;
          padding: ${euiTheme.size.l};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2 data-test-subj="observabilityEpisodeDetailsSidebarTitle">{sidebarHeaderTitle}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate('xpack.observability.episodeDetails.sidebarViewLegend', {
              defaultMessage: 'Sidebar section',
            })}
            type="single"
            buttonSize="compressed"
            idSelected={sidebarPanel}
            onChange={(id) => setSidebarPanel(id as EpisodeDetailsSidebarPanel)}
            options={[
              {
                id: 'episode_details',
                'data-test-subj': 'observabilityEpisodeDetailsSidebarTabEpisodeDetails',
                label: i18n.translate('xpack.observability.episodeDetails.sidebarTabTitle', {
                  defaultMessage: 'Details',
                }),
              },
              {
                id: 'runbook',
                'data-test-subj': 'observabilityEpisodeDetailsSidebarTabRunbook',
                label: runbookSidebarTitle,
              },
            ]}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule
        css={css`
          margin-block: 0;
          margin-inline: ${euiTheme.size.l};
          inline-size: unset;
        `}
      />
      <div
        css={css`
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: ${euiTheme.size.l};
        `}
        data-test-subj="observabilityEpisodeDetailsSidebarBody"
      >
        {sidebarPanel === 'episode_details' ? (
          <>
            <EuiDescriptionList
              compressed
              type="responsiveColumn"
              listItems={[
                {
                  title: i18n.translate('xpack.observability.episodeDetails.episodeIdLabel', {
                    defaultMessage: 'Alert episode id',
                  }),
                  description: episodeId ?? '—',
                },
                {
                  title: i18n.translate('xpack.observability.episodeDetails.groupingLabel', {
                    defaultMessage: 'Grouping',
                  }),
                  description: (
                    <AlertEpisodeGroupingFields
                      fields={rule?.grouping?.fields ?? []}
                      emptyDisplay="—"
                    />
                  ),
                },
                {
                  title: i18n.translate('xpack.observability.episodeDetails.triggeredLabel', {
                    defaultMessage: 'Triggered',
                  }),
                  description: triggeredAt
                    ? new Date(triggeredAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : '—',
                },
                {
                  title: i18n.translate('xpack.observability.episodeDetails.durationLabel', {
                    defaultMessage: 'Duration',
                  }),
                  description: durationMs != null ? formatDurationMs(durationMs) : '—',
                },
              ]}
            />
            {rule ? (
              <>
                <EuiSpacer size="l" />
                <EuiTitle size="xxs">
                  <h3 data-test-subj="observabilityEpisodeDetailsRuleOverviewHeading">
                    {i18n.translate('xpack.observability.episodeDetails.ruleOverviewTitle', {
                      defaultMessage: 'Rule overview',
                    })}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="m" />
                <EuiPanel
                  hasBorder
                  paddingSize="m"
                  data-test-subj="observabilityEpisodeDetailsRuleOverviewPanel"
                >
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={true} wrap>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">
                        <strong>{rule.metadata.name}</strong>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        |
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiIcon type="bell" size="s" aria-hidden />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText size="xs" color="subdued">
                            {ruleKindLabel}
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        |
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge
                        color={rule.enabled ? 'success' : 'default'}
                        data-test-subj="observabilityEpisodeDetailsRuleStatusBadge"
                      >
                        {rule.enabled
                          ? i18n.translate('xpack.observability.episodeDetails.ruleStatusEnabled', {
                              defaultMessage: 'Enabled',
                            })
                          : i18n.translate(
                              'xpack.observability.episodeDetails.ruleStatusDisabled',
                              {
                                defaultMessage: 'Disabled',
                              }
                            )}
                      </EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="s" />
                  <EuiCodeBlock
                    language="esql"
                    fontSize="s"
                    paddingSize="s"
                    isCopyable
                    overflowHeight={240}
                    data-test-subj="observabilityEpisodeDetailsRuleQueryCodeBlock"
                  >
                    {ruleOverviewEsql}
                  </EuiCodeBlock>
                </EuiPanel>
              </>
            ) : null}
          </>
        ) : runbookArtifact?.value != null && runbookArtifact.value.length > 0 ? (
          <EuiText
            size="s"
            css={css`
              white-space: pre-wrap;
              word-break: break-word;
            `}
            data-test-subj="observabilityEpisodeDetailsRunbookContent"
          >
            {runbookArtifact.value}
          </EuiText>
        ) : (
          <EuiText
            size="s"
            color="subdued"
            data-test-subj="observabilityEpisodeDetailsRunbookEmpty"
          >
            {i18n.translate('xpack.observability.episodeDetails.runbookEmpty', {
              defaultMessage: 'No runbook has been added to this rule.',
            })}
          </EuiText>
        )}
      </div>
    </>
  );

  return (
    <ObservabilityPageTemplate
      data-test-subj="observabilityEpisodeDetailsPage"
      pageHeader={{
        pageTitle,
        description,
      }}
      pageSectionProps={{
        grow: true,
        paddingSize: 'none',
        contentProps: {
          css: css`
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            ${logicalCSS('min-height')}: 0;
          `,
        },
      }}
    >
      <HeaderMenu />

      {isLoading ? (
        <CenterJustifiedSpinner />
      ) : (
        <>
          <EuiSplitPanel.Outer direction="row" hasBorder={false} hasShadow={false} grow>
            <EuiSplitPanel.Inner grow paddingSize="l">
              <EpisodeLifecycleHeatmap eventRows={eventRows} />
              <EuiSpacer size="l" />
              {rule ? (
                <EuiAccordion
                  id="observabilityRelatedAlertEpisodes"
                  paddingSize="none"
                  buttonProps={{
                    paddingSize: 'm',
                    css: css`
                      .euiAccordion__buttonContent {
                        width: 100%;
                      }
                    `,
                  }}
                  buttonContent={
                    <EuiText>
                      <h3>
                        {i18n.translate('xpack.observability.episodeDetails.relatedEpisodesTitle', {
                          defaultMessage: 'Related alert episodes',
                        })}
                      </h3>
                    </EuiText>
                  }
                  initialIsOpen
                  data-test-subj="observabilityRelatedAlertEpisodesAccordion"
                >
                  {isLoadingRelatedEpisodes ? (
                    <EuiFlexGroup justifyContent="center">
                      <EuiFlexItem grow={false}>
                        <EuiLoadingSpinner size="l" />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ) : relatedEpisodeRows.length === 0 ? (
                    <EuiPanel
                      color="subdued"
                      hasShadow={false}
                      paddingSize="m"
                      data-test-subj="observabilityRelatedEpisodesEmpty"
                    >
                      <EuiFlexGroup justifyContent="center" alignItems="center">
                        <EuiFlexItem grow={false}>
                          <EuiText size="s" color="subdued" textAlign="center">
                            {i18n.translate(
                              'xpack.observability.episodeDetails.relatedEpisodesEmpty',
                              {
                                defaultMessage: 'No related episodes found.',
                              }
                            )}
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPanel>
                  ) : (
                    <EuiFlexGroup direction="column" gutterSize="s">
                      {relatedEpisodeRows.map((row) => {
                        const relatedId = row['episode.id'] as string;
                        const relatedGroupHash = row.group_hash as string | undefined;
                        return (
                          <RelatedAlertEpisode
                            key={relatedId}
                            episode={row}
                            rule={rule}
                            episodeAction={relatedEpisodeActionsMap?.get(relatedId)}
                            groupAction={
                              relatedGroupHash
                                ? relatedGroupActionsMap?.get(relatedGroupHash)
                                : undefined
                            }
                            onNavigate={() =>
                              history.push(paths.observability.alertingV2EpisodeDetails(relatedId))
                            }
                          />
                        );
                      })}
                    </EuiFlexGroup>
                  )}
                </EuiAccordion>
              ) : null}
            </EuiSplitPanel.Inner>
            <EuiSplitPanel.Inner
              grow={false}
              paddingSize="none"
              css={css`
                flex-shrink: 0;
                flex-basis: 400px;
                min-width: 40px;
                max-width: 500px;
                border-left: ${euiTheme.border.thin};
                display: flex;
                flex-direction: column;
                min-height: 0;
              `}
              data-test-subj="observabilityEpisodeDetailsSidebar"
            >
              {sidebar}
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </>
      )}
    </ObservabilityPageTemplate>
  );
}
