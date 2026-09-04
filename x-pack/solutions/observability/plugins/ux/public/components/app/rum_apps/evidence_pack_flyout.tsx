/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import {
  rateVital,
  type RumErrorGroup,
  type RumPageRow,
  type RumVitalRating,
} from '../../../../common/rum_app';
import type { RumAppInventoryRow } from '../../../../common/rum_apps';
import { emptyRumAppSettings, type RumAppSettings } from '../../../../common/rum_app_settings';
import {
  buildEvidenceFacts,
  evidenceAnalystFollowUp,
  evidenceAnalystPrompt,
  evidenceSummaryPrompt,
  topErrorGroups,
  worstPagesByLcp,
} from '../../../../common/rum_evidence';
import { rumPerformanceScoreBand } from '../../../../common/rum_performance_score';
import {
  rumGithubLinksForError,
  rumGithubLinksForEvidence,
} from '../../../../common/rum_repository_links';
import type { RumSessionSummary } from '../../../../common/session_replay';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumAppSettings, fetchRumErrors, fetchRumPages } from '../../../services/rest/rum_api';
import { fetchSessionReplaySessions } from '../../../services/rest/session_replay_api';
import type { RumAiLocationState } from '../../../utils/rum_search';
import { mergeRumSearch, pushRumPath, sessionsPatch } from '../../../utils/rum_search';
import { VITAL_P75_HELP } from '../../../utils/vital_help';
import { VitalHelpLabel } from '../../../utils/vital_help_label';
import { uxAppPath } from '../../../utils/ux_app_path';
import { useUxFlyoutSession, uxFlyoutProps } from '../../flyout/ux_flyout_props';
import { formatRelativeTime, shortenPath } from '../../session_replay/session_ui';
import { RumGithubLinks } from '../rum_settings/rum_github_links';
import { EvidenceAnalystPanel } from './evidence_analyst_panel';
import { ScoreBreakdownFlyout } from './score_breakdown_flyout';
import { ScoreSparkline } from './score_sparkline';
import { useEvidenceSummary } from './use_evidence_summary';

const dash = i18n.translate('xpack.ux.evidence.emptyValueLabel', {
  defaultMessage: '—',
});

const playLabel = i18n.translate('xpack.ux.evidence.playButtonLabel', {
  defaultMessage: 'Play',
});

const formatMs = (ms: number | null): string => {
  if (ms == null) {
    return dash;
  }
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
};

const sessionLabel = (session: RumSessionSummary): string =>
  session.user.name || session.user.email || session.user.id || session.sessionId.slice(0, 8);

const scoreBandLabel = (score: number): string => {
  if (score >= 90) {
    return i18n.translate('xpack.ux.evidence.scoreBandGoodLabel', { defaultMessage: 'Good' });
  }
  if (score >= 50) {
    return i18n.translate('xpack.ux.evidence.scoreBandNeedsWorkLabel', {
      defaultMessage: 'Needs improvement',
    });
  }
  return i18n.translate('xpack.ux.evidence.scoreBandPoorLabel', { defaultMessage: 'Poor' });
};

const vitalColor = (
  rating: RumVitalRating | null
): 'success' | 'warning' | 'danger' | 'subdued' => {
  if (rating === 'good') {
    return 'success';
  }
  if (rating === 'ni') {
    return 'warning';
  }
  if (rating === 'poor') {
    return 'danger';
  }
  return 'subdued';
};

const EvidenceKpis = ({
  app,
  onOpenScore,
}: {
  app: RumAppInventoryRow;
  onOpenScore: () => void;
}) => {
  const score = app.score;
  const room = score == null ? 0 : 100 - score;
  const delta =
    app.scoreDelta == null || Math.round(app.scoreDelta) === 0 ? null : Math.round(app.scoreDelta);

  if (score == null && app.opportunity == null) {
    return null;
  }

  return (
    <EuiPanel hasBorder paddingSize="s" data-test-subj="uxEvidenceKpis">
      <EuiFlexGroup gutterSize="l" alignItems="flexStart">
        {score != null ? (
          <EuiFlexItem>
            <EuiStat
              title={
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                  <EuiFlexItem grow={false}>
                    <EuiBadge
                      color={rumPerformanceScoreBand(score)}
                      onClick={onOpenScore}
                      onClickAriaLabel={i18n.translate(
                        'xpack.ux.evidence.scoreOpenBreakdownAriaLabel',
                        {
                          defaultMessage: 'Open score breakdown for {name}',
                          values: { name: app.name },
                        }
                      )}
                    >
                      {score}
                    </EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <ScoreSparkline
                      scores={app.scoreTrend}
                      score={score}
                      ariaLabel={i18n.translate('xpack.ux.evidence.scoreSparklineAriaLabel', {
                        defaultMessage: 'Score over the selected range',
                      })}
                    />
                  </EuiFlexItem>
                  {delta != null ? (
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color={delta < 0 ? 'danger' : 'success'}>
                        {delta > 0 ? '+' : ''}
                        {delta}
                      </EuiText>
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              }
              description={i18n.translate('xpack.ux.evidence.scoreTitle', {
                defaultMessage: 'Score',
              })}
              titleSize="s"
            />
            <EuiText size="xs" color="subdued">
              {scoreBandLabel(score)}
            </EuiText>
          </EuiFlexItem>
        ) : null}
        {app.opportunity != null ? (
          <EuiFlexItem>
            <EuiStat
              title={app.opportunity.toLocaleString()}
              description={i18n.translate('xpack.ux.evidence.opportunityTitle', {
                defaultMessage: 'Opportunity',
              })}
              titleSize="s"
            />
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.ux.evidence.opportunityRoomDescription', {
                defaultMessage: '{room} points to 100',
                values: { room },
              })}
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const EvidenceSection = ({
  title,
  metricLabel,
  empty,
  children,
}: {
  title: string;
  metricLabel?: ReactNode;
  empty: string;
  children: ReactNode;
}) => {
  const hasRows = children != null && children !== false;
  return (
    <div>
      <EuiFlexGroup
        alignItems="baseline"
        justifyContent="spaceBetween"
        gutterSize="s"
        responsive={false}
      >
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {metricLabel && hasRows ? (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {metricLabel}
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {hasRows ? (
        children
      ) : (
        <EuiText size="s" color="subdued">
          {empty}
        </EuiText>
      )}
    </div>
  );
};

const EvidenceRow = ({
  primary,
  secondary,
  metric,
  testSubj,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  metric: ReactNode;
  testSubj?: string;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      data-test-subj={testSubj}
      css={css`
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        column-gap: ${euiTheme.size.m};
        align-items: center;
        min-height: ${euiTheme.size.xl};
        padding: ${euiTheme.size.xs} 0;
      `}
    >
      <div className="eui-textTruncate">
        {primary}
        {secondary ? (
          <EuiText size="xs" color="subdued" className="eui-textTruncate">
            {secondary}
          </EuiText>
        ) : null}
      </div>
      <div
        css={css`
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: ${euiTheme.size.xs};
          min-width: ${euiTheme.base * 5.5}px;
          font-variant-numeric: tabular-nums;
        `}
      >
        {metric}
      </div>
    </div>
  );
};

export function EvidencePackFlyout({
  app,
  firing,
  rangeFrom,
  rangeTo,
  includeBots,
  botUa,
  onClose,
}: {
  app: RumAppInventoryRow;
  firing: boolean;
  rangeFrom: string;
  rangeTo: string;
  includeBots?: string;
  botUa?: string;
  onClose: () => void;
}) {
  const titleId = useGeneratedHtmlId();
  const { euiTheme } = useEuiTheme();
  const { http } = useKibanaServices();
  const history = useHistory();
  const flyoutSession = useUxFlyoutSession();
  const facts = useMemo(() => buildEvidenceFacts(app, firing), [app, firing]);

  const [pages, setPages] = useState<RumPageRow[]>([]);
  const [errors, setErrors] = useState<RumErrorGroup[]>([]);
  const [sessions, setSessions] = useState<RumSessionSummary[]>([]);
  const [settings, setSettings] = useState<RumAppSettings>(() => emptyRumAppSettings(app.name));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoreOpen, setScoreOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = {
          http,
          rangeFrom,
          rangeTo,
          serviceName: app.name,
          includeBots,
          botUa,
        };
        const [pageResult, errorResult, sessionResult, appSettings] = await Promise.all([
          fetchRumPages(query),
          fetchRumErrors(query),
          fetchSessionReplaySessions({
            ...query,
            perPage: 5,
            page: 0,
            sortField: 'errorCount',
            sortDirection: 'desc',
          }),
          fetchRumAppSettings({ http, serviceName: app.name }).catch(() =>
            emptyRumAppSettings(app.name)
          ),
        ]);
        if (cancelled) {
          return;
        }
        setPages(worstPagesByLcp(pageResult.pages));
        setErrors(topErrorGroups(errorResult.groups));
        setSessions(sessionResult.sessions);
        setSettings(appSettings);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [app.name, http, includeBots, botUa, rangeFrom, rangeTo]);

  const packArgs = useMemo(
    () => ({
      app,
      rangeFrom,
      rangeTo,
      facts,
      pages,
      errors,
      sessions,
    }),
    [app, errors, facts, pages, rangeFrom, rangeTo, sessions]
  );

  const summaryPrompt = !loading && !error ? evidenceSummaryPrompt(packArgs) : '';
  const summary = useEvidenceSummary({
    ready: !loading && !error,
    prompt: summaryPrompt,
  });

  const openApp = (suffix: string, patch?: Parameters<typeof pushRumPath>[2]) => {
    pushRumPath(history, suffix, { serviceName: app.name, ...patch });
    onClose();
  };

  const issueDraft =
    summary.status === 'done' && summary.fileIssue && summary.markdown
      ? {
          title: summary.issueTitle || app.name,
          body: [
            summary.markdown,
            '',
            `App: \`${app.name}\``,
            `Range: ${rangeFrom} → ${rangeTo}`,
            sessions.length > 0
              ? `Sessions: ${sessions.map((session) => `\`${session.sessionId}\``).join(', ')}`
              : undefined,
          ]
            .filter((line): line is string => line != null)
            .join('\n'),
        }
      : undefined;

  const githubLinks = rumGithubLinksForEvidence(
    settings,
    {
      rangeFrom,
      rangeTo,
      score: app.score,
      pages,
      errors,
      sessions,
    },
    issueDraft
  );

  const askAnalyst = () => {
    history.push({
      pathname: uxAppPath(app.name, '/ai'),
      search: mergeRumSearch(history.location.search, { serviceName: '' }),
      state: {
        rumAiFollowUp: summary.markdown
          ? evidenceAnalystFollowUp(packArgs, summary.markdown)
          : evidenceAnalystPrompt(packArgs),
      } satisfies RumAiLocationState,
    });
    onClose();
  };

  const flyoutTitle = i18n.translate('xpack.ux.evidence.flyoutTitle', {
    defaultMessage: 'Investigate {name}',
    values: { name: app.name },
  });

  return (
    <>
      <EuiFlyout
        {...uxFlyoutProps({ title: flyoutTitle, session: flyoutSession })}
        onClose={onClose}
        aria-labelledby={titleId}
        data-test-subj="uxEvidencePackFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h2 id={titleId} className="eui-textBreakWord">
                  {flyoutTitle}
                </h2>
              </EuiTitle>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.ux.evidence.flyoutDescription', {
                  defaultMessage:
                    'Analyst summarizes this range first. File an issue only if it finds a defect.',
                })}
              </EuiText>
            </EuiFlexItem>
            {firing ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="danger">
                  {i18n.translate('xpack.ux.evidence.firingBadgeLabel', {
                    defaultMessage: 'Firing',
                  })}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EvidenceKpis app={app} onOpenScore={() => setScoreOpen(true)} />
          {app.score != null || app.opportunity != null ? <EuiSpacer /> : null}
          {error ? (
            <EuiCallOut
              announceOnMount
              color="danger"
              title={i18n.translate('xpack.ux.evidence.loadErrorTitle', {
                defaultMessage: 'Unable to load evidence',
              })}
            >
              <p>{error}</p>
            </EuiCallOut>
          ) : null}
          {loading ? (
            <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 160 }}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexGroup>
          ) : (
            <>
              {!error ? (
                <>
                  <EvidenceAnalystPanel
                    status={summary.status}
                    markdown={summary.markdown}
                    error={summary.error}
                    fileIssue={summary.fileIssue}
                  />
                  {summary.status !== 'idle' ? <EuiSpacer /> : null}
                </>
              ) : null}
              <EvidenceSection
                title={i18n.translate('xpack.ux.evidence.pagesTitle', {
                  defaultMessage: 'Slowest pages',
                })}
                metricLabel={
                  <VitalHelpLabel
                    label={i18n.translate('xpack.ux.evidence.pagesMetricLabel', {
                      defaultMessage: 'p75 LCP',
                    })}
                    tooltip={VITAL_P75_HELP.lcp}
                  />
                }
                empty={i18n.translate('xpack.ux.evidence.pagesEmptyDescription', {
                  defaultMessage: 'No page LCP in this range.',
                })}
              >
                {pages.length > 0
                  ? pages.map((page) => (
                      <EvidenceRow
                        key={page.path}
                        testSubj={`uxEvidencePage-${page.path}`}
                        primary={
                          <EuiLink
                            data-test-subj="uxEvidencePackFlyoutLink"
                            onClick={() => openApp('/pages', { pageUrl: page.path })}
                          >
                            {shortenPath(page.path)}
                          </EuiLink>
                        }
                        metric={
                          <EuiText size="s" color={vitalColor(rateVital('lcp', page.p75Lcp))}>
                            {formatMs(page.p75Lcp)}
                          </EuiText>
                        }
                      />
                    ))
                  : null}
              </EvidenceSection>
              <EuiHorizontalRule margin="m" />
              <EvidenceSection
                title={i18n.translate('xpack.ux.evidence.errorsTitle', {
                  defaultMessage: 'Top errors',
                })}
                metricLabel={i18n.translate('xpack.ux.evidence.errorsMetricLabel', {
                  defaultMessage: 'Sessions',
                })}
                empty={i18n.translate('xpack.ux.evidence.errorsEmptyDescription', {
                  defaultMessage: 'No error groups in this range.',
                })}
              >
                {errors.length > 0
                  ? errors.map((group) => {
                      const file = rumGithubLinksForError(settings, group, { rangeFrom, rangeTo });
                      return (
                        <EvidenceRow
                          key={group.key}
                          testSubj={`uxEvidenceError-${group.key}`}
                          primary={
                            <EuiLink
                              data-test-subj="uxEvidencePackFlyoutLink"
                              onClick={() =>
                                openApp('/session-replay', sessionsPatch({ errorGroup: group.key }))
                              }
                            >
                              {group.type}
                            </EuiLink>
                          }
                          secondary={
                            file.fileHref && file.fileLabel ? (
                              <>
                                {group.message}
                                {' · '}
                                <EuiLink
                                  href={file.fileHref}
                                  target="_blank"
                                  data-test-subj="uxEvidenceErrorFileLink"
                                >
                                  {file.fileLabel}
                                </EuiLink>
                              </>
                            ) : (
                              group.message
                            )
                          }
                          metric={<EuiText size="s">{group.sessionCount.toLocaleString()}</EuiText>}
                        />
                      );
                    })
                  : null}
              </EvidenceSection>
              <EuiHorizontalRule margin="m" />
              <EvidenceSection
                title={i18n.translate('xpack.ux.evidence.sessionsTitle', {
                  defaultMessage: 'Sessions to open',
                })}
                empty={i18n.translate('xpack.ux.evidence.sessionsEmptyDescription', {
                  defaultMessage: 'No sessions in this range.',
                })}
              >
                {sessions.length > 0
                  ? sessions.map((session) => (
                      <EvidenceRow
                        key={session.sessionId}
                        testSubj={`uxEvidenceSession-${session.sessionId}`}
                        primary={
                          <EuiLink
                            data-test-subj="uxEvidencePackFlyoutLink"
                            onClick={() => openApp(`/session-replay/${session.sessionId}`)}
                          >
                            {sessionLabel(session)}
                          </EuiLink>
                        }
                        secondary={`${formatRelativeTime(session.startTime)}${
                          session.entryPage ? ` · ${shortenPath(session.entryPage)}` : ''
                        }`}
                        metric={
                          <>
                            {session.errorCount > 0 ? (
                              <EuiToolTip
                                content={i18n.translate('xpack.ux.evidence.sessionErrorsTooltip', {
                                  defaultMessage: '{count, plural, one {# error} other {# errors}}',
                                  values: { count: session.errorCount },
                                })}
                              >
                                <EuiBadge color="danger" tabIndex={0}>
                                  {session.errorCount}
                                </EuiBadge>
                              </EuiToolTip>
                            ) : null}
                            {session.hasReplay ? (
                              <EuiToolTip content={playLabel} disableScreenReaderOutput>
                                <EuiButtonIcon
                                  aria-label={playLabel}
                                  data-test-subj={`uxEvidencePlay-${session.sessionId}`}
                                  display="empty"
                                  iconType="play"
                                  onClick={() =>
                                    openApp(`/session-replay/${session.sessionId}/replay`)
                                  }
                                  size="s"
                                />
                              </EuiToolTip>
                            ) : (
                              <span
                                css={css`
                                  width: ${euiTheme.size.l};
                                `}
                              />
                            )}
                          </>
                        }
                      />
                    ))
                  : null}
              </EvidenceSection>
            </>
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup
            justifyContent="spaceBetween"
            alignItems="center"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                flush="left"
                data-test-subj="uxEvidencePackFlyoutCloseButton"
                onClick={onClose}
              >
                {i18n.translate('xpack.ux.evidence.closeButtonLabel', { defaultMessage: 'Close' })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    data-test-subj="uxEvidencePackFlyoutOpenAppButton"
                    onClick={() => openApp('/')}
                  >
                    {i18n.translate('xpack.ux.evidence.openAppButtonLabel', {
                      defaultMessage: 'Open app',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                {!loading && summary.status === 'done' && summary.fileIssue ? (
                  <RumGithubLinks
                    links={githubLinks}
                    showFile={false}
                    fillIssue
                    grouped={false}
                    onAddRepository={() => openApp('/settings')}
                  />
                ) : null}
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    fill={
                      !(summary.status === 'done' && summary.fileIssue && githubLinks.issueHref)
                    }
                    onClick={askAnalyst}
                    disabled={loading}
                    data-test-subj="uxEvidenceAskAnalystButton"
                  >
                    {summary.markdown
                      ? i18n.translate('xpack.ux.evidence.continueInAnalystButtonLabel', {
                          defaultMessage: 'Continue in Analyst',
                        })
                      : i18n.translate('xpack.ux.evidence.askAnalystButtonLabel', {
                          defaultMessage: 'Ask Analyst',
                        })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
      {scoreOpen ? <ScoreBreakdownFlyout app={app} onClose={() => setScoreOpen(false)} /> : null}
    </>
  );
}
