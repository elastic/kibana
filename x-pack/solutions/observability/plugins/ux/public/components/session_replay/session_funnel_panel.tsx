/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import {
  FUNNEL_MIN_STEPS,
  formatSampleSessionId,
  type FunnelStepDef,
} from '../../../common/session_funnel';
import type {
  ExitPattern,
  FrictionPattern,
  PathPattern,
  PathPatternKind,
  SessionPatternsResponse,
} from '../../../common/session_patterns';
import { useLegacyUrlParams } from '../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { fetchSessionPatterns } from '../../services/rest/session_replay_api';
import type { FunnelPageLocationState } from './conversion_goal_panel';
import { shortenPath } from './session_ui';
import { pushRumPath, sessionsPatch } from '../../utils/rum_search';
import { serviceNameFromPath, uxAppPath } from '../../utils/ux_app_path';

const percent = (ratio: number): string => `${Math.round(ratio * 1000) / 10}%`;

const toFunnelSteps = (kind: PathPatternKind, steps: string[]): FunnelStepDef[] =>
  steps.map((step) => ({
    type: kind,
    value: step.replace(/^#\/?/, ''),
    label: step,
  }));

const PathTrail = ({ steps }: { steps: string[] }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
    {steps.map((step, index) => (
      <React.Fragment key={`${step}-${index}`}>
        {index > 0 && (
          <EuiFlexItem grow={false}>
            <EuiIcon type="sortRight" color="subdued" size="s" aria-hidden={true} />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{shortenPath(step, 32)}</EuiBadge>
        </EuiFlexItem>
      </React.Fragment>
    ))}
  </EuiFlexGroup>
);

const SessionIdLinks = ({ sessionIds }: { sessionIds: string[] }) => {
  const history = useHistory();
  if (sessionIds.length === 0) {
    return null;
  }
  return (
    <EuiText size="xs" color="subdued">
      {sessionIds.map((sessionId, index) => (
        <span key={sessionId}>
          {index > 0 ? ', ' : ''}
          <EuiLink
            data-test-subj={`uxPatternSession-${sessionId}`}
            href={history.createHref({
              pathname: uxAppPath(
                serviceNameFromPath(history.location.pathname),
                `/session-replay/${encodeURIComponent(sessionId)}`
              ),
            })}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              pushRumPath(history, `/session-replay/${encodeURIComponent(sessionId)}`);
            }}
          >
            {formatSampleSessionId(sessionId)}
          </EuiLink>
        </span>
      ))}
    </EuiText>
  );
};

const PatternRow = ({
  steps,
  sessionCount,
  share,
  errorSessionCount,
  rageSessionCount,
  sampleSessionIds,
  maxCount,
  onInspect,
  onViewSessions,
}: {
  steps: string[];
  sessionCount: number;
  share: number;
  errorSessionCount?: number;
  rageSessionCount?: number;
  sampleSessionIds: string[];
  maxCount: number;
  onInspect?: () => void;
  onViewSessions?: () => void;
}) => (
  <div>
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
      <EuiFlexItem grow={2}>
        <PathTrail steps={steps} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiProgress value={sessionCount} max={Math.max(maxCount, 1)} color="primary" size="l" />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ minWidth: 110, textAlign: 'right' }}>
        <EuiText size="s">
          <strong>{sessionCount}</strong>
          {' · '}
          {percent(share)}
        </EuiText>
      </EuiFlexItem>
      {onInspect && steps.length >= FUNNEL_MIN_STEPS && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" onClick={onInspect} data-test-subj="uxPatternInspectButton">
            {i18n.translate('xpack.ux.journeys.openAsFunnelButtonLabel', {
              defaultMessage: 'Open as funnel',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      {onViewSessions && sampleSessionIds.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" onClick={onViewSessions} data-test-subj="uxPatternViewSessions">
            {i18n.translate('xpack.ux.journeys.viewSessions', { defaultMessage: 'View sessions' })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
    <EuiSpacer size="xs" />
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      {(errorSessionCount ?? 0) > 0 && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="danger" iconType="warning">
            {i18n.translate('xpack.ux.patterns.errorsBadge', {
              defaultMessage: '{count, plural, one {# with errors} other {# with errors}}',
              values: { count: errorSessionCount },
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {(rageSessionCount ?? 0) > 0 && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="warning" iconType="bolt">
            {i18n.translate('xpack.ux.patterns.rageBadge', {
              defaultMessage:
                '{count, plural, one {# with rage clicks} other {# with rage clicks}}',
              values: { count: rageSessionCount },
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <SessionIdLinks sessionIds={sampleSessionIds} />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="m" />
  </div>
);

export function SessionFunnelPanel() {
  const { http } = useKibanaServices();
  const history = useHistory();
  const {
    rangeId,
    urlParams: { rangeFrom = 'now-24h', rangeTo = 'now', serviceName, kuery, analyticsMode },
  } = useLegacyUrlParams();

  const [patterns, setPatterns] = useState<SessionPatternsResponse | null>(null);
  const [patternsLoading, setPatternsLoading] = useState(true);
  const [patternsError, setPatternsError] = useState<string | null>(null);

  const loadPatterns = useCallback(async () => {
    void rangeId;
    setPatternsLoading(true);
    setPatternsError(null);
    try {
      const data = await fetchSessionPatterns({
        http,
        rangeFrom,
        rangeTo,
        serviceName: typeof serviceName === 'string' ? serviceName : undefined,
        kuery,
        analyticsMode,
      });
      setPatterns(data);
    } catch (err) {
      setPatternsError(err instanceof Error ? err.message : String(err));
      setPatterns(null);
    } finally {
      setPatternsLoading(false);
    }
  }, [http, rangeFrom, rangeTo, serviceName, kuery, analyticsMode, rangeId]);

  useEffect(() => {
    void loadPatterns();
  }, [loadPatterns]);

  const inspect = (kind: PathPatternKind, steps: string[]) => {
    const state: FunnelPageLocationState = {
      funnelPresetSteps: toFunnelSteps(kind, steps),
    };
    history.push({
      pathname: uxAppPath(serviceNameFromPath(history.location.pathname), '/funnels'),
      search: history.location.search,
      state,
    });
  };

  const viewSessions = (ids: string[]) => {
    if (ids.length === 0) {
      return;
    }
    pushRumPath(history, '/session-replay', sessionsPatch({ sessionIds: ids.join(',') }));
  };

  const maxJourney = Math.max(1, ...(patterns?.journeys.map((row) => row.sessionCount) ?? [1]));
  const maxActivity = Math.max(1, ...(patterns?.activities.map((row) => row.sessionCount) ?? [1]));
  const maxExit = Math.max(1, ...(patterns?.exits.map((row) => row.sessionCount) ?? [1]));
  const maxFriction = Math.max(1, ...(patterns?.friction.map((row) => row.sessionCount) ?? [1]));

  return (
    <EuiPanel paddingSize="m" data-test-subj="uxSessionFunnelPage">
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.ux.journeys.pageTitle', {
            defaultMessage: 'Journeys',
          })}
        </h2>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.ux.journeys.pageDescription', {
            defaultMessage:
              'Recurring page paths, click sequences, and exits from recent sessions. Open a pattern as a funnel to measure conversion.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      {patternsError && (
        <>
          <EuiCallOut
            announceOnMount
            color="danger"
            size="s"
            title={i18n.translate('xpack.ux.patterns.errorTitle', {
              defaultMessage: 'Could not load patterns',
            })}
          >
            <p>{patternsError}</p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {patternsLoading && !patterns ? (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              {i18n.translate('xpack.ux.patterns.loadingLabel', {
                defaultMessage: 'Finding patterns…',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : patterns && patterns.sessionsConsidered === 0 ? (
        <EuiEmptyPrompt
          iconType="chartBarHorizontal"
          title={
            <h3>
              {i18n.translate('xpack.ux.patterns.emptyTitle', {
                defaultMessage: 'No sessions in this range',
              })}
            </h3>
          }
          body={
            <p>
              {i18n.translate('xpack.ux.patterns.emptyDescription', {
                defaultMessage: 'Widen the date range or pick another service to mine journeys.',
              })}
            </p>
          }
        />
      ) : patterns ? (
        <>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.ux.patterns.minedTitle', {
                defaultMessage: 'Mined from sessions',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiStat
            title={String(patterns.sessionsConsidered)}
            description={i18n.translate('xpack.ux.patterns.scannedDescription', {
              defaultMessage: 'Sessions scanned',
            })}
            titleSize="s"
          />
          <EuiSpacer size="l" />

          <PatternSection
            title={i18n.translate('xpack.ux.patterns.journeysTitle', {
              defaultMessage: 'Top page journeys',
            })}
            empty={i18n.translate('xpack.ux.patterns.journeysEmptyDescription', {
              defaultMessage: 'No repeating page paths in this sample.',
            })}
            rows={patterns.journeys}
            maxCount={maxJourney}
            onInspect={inspect}
            onViewSessions={viewSessions}
          />

          <EuiHorizontalRule margin="l" />

          <PatternSection
            title={i18n.translate('xpack.ux.patterns.activitiesTitle', {
              defaultMessage: 'Top click sequences',
            })}
            empty={i18n.translate('xpack.ux.patterns.activitiesEmptyDescription', {
              defaultMessage: 'No labeled click sequences in this sample.',
            })}
            rows={patterns.activities}
            maxCount={maxActivity}
            onInspect={inspect}
            onViewSessions={viewSessions}
          />

          <EuiHorizontalRule margin="l" />

          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('xpack.ux.patterns.exitsTitle', {
                defaultMessage: 'Where sessions end',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          {patterns.exits.length === 0 ? (
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.ux.patterns.exitsEmptyDescription', {
                defaultMessage: 'No exit pages in this sample.',
              })}
            </EuiText>
          ) : (
            patterns.exits.map((row: ExitPattern) => (
              <PatternRow
                key={`exit-${row.step}`}
                steps={[row.step]}
                sessionCount={row.sessionCount}
                share={row.share}
                sampleSessionIds={row.sampleSessionIds}
                maxCount={maxExit}
                onViewSessions={() => viewSessions(row.sampleSessionIds)}
              />
            ))
          )}

          {patterns.friction.length > 0 && (
            <>
              <EuiHorizontalRule margin="l" />
              <EuiTitle size="xxs">
                <h3>
                  {i18n.translate('xpack.ux.patterns.frictionTitle', {
                    defaultMessage: 'Friction',
                  })}
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              {patterns.friction.map((row: FrictionPattern) => (
                <PatternRow
                  key={`${row.kind}-${row.step}`}
                  steps={[row.step]}
                  sessionCount={row.sessionCount}
                  share={row.share}
                  errorSessionCount={row.kind === 'errors' ? row.sessionCount : 0}
                  rageSessionCount={row.kind === 'rage' ? row.sessionCount : 0}
                  sampleSessionIds={row.sampleSessionIds}
                  maxCount={maxFriction}
                  onViewSessions={() => viewSessions(row.sampleSessionIds)}
                />
              ))}
            </>
          )}
        </>
      ) : null}
    </EuiPanel>
  );
}

function PatternSection({
  title,
  empty,
  rows,
  maxCount,
  onInspect,
  onViewSessions,
}: {
  title: string;
  empty: string;
  rows: PathPattern[];
  maxCount: number;
  onInspect: (kind: PathPatternKind, steps: string[]) => void;
  onViewSessions: (ids: string[]) => void;
}) {
  return (
    <>
      <EuiTitle size="xxs">
        <h3>{title}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {rows.length === 0 ? (
        <EuiText size="s" color="subdued">
          {empty}
        </EuiText>
      ) : (
        rows.map((row) => (
          <PatternRow
            key={`${row.kind}-${row.steps.join('>')}`}
            steps={row.steps}
            sessionCount={row.sessionCount}
            share={row.share}
            errorSessionCount={row.errorSessionCount}
            rageSessionCount={row.rageSessionCount}
            sampleSessionIds={row.sampleSessionIds}
            maxCount={maxCount}
            onInspect={() => onInspect(row.kind, row.steps)}
            onViewSessions={() => onViewSessions(row.sampleSessionIds)}
          />
        ))
      )}
    </>
  );
}
