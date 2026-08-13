/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiSelect,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import {
  DEFAULT_FUNNEL_STEPS,
  FUNNEL_MAX_STEPS,
  FUNNEL_MIN_STEPS,
  FUNNEL_STEP_VALUE_MAX_LENGTH,
  type FunnelStepDef,
  type FunnelStepType,
  type SessionFunnelResponse,
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
import { fetchSessionFunnel, fetchSessionPatterns } from '../../services/rest/session_replay_api';
import { shortenPath } from './session_ui';
import { pushRumPath, sessionsPatch } from '../../utils/rum_search';

const STEP_TYPE_OPTIONS = [
  {
    value: 'page',
    text: i18n.translate('xpack.ux.funnels.stepTypePageDropDownOptionLabel', {
      defaultMessage: 'Page',
    }),
  },
  {
    value: 'activity',
    text: i18n.translate('xpack.ux.funnels.stepTypeActivityDropDownOptionLabel', {
      defaultMessage: 'Activity',
    }),
  },
];

const percent = (ratio: number): string => `${Math.round(ratio * 1000) / 10}%`;

const usableSteps = (steps: FunnelStepDef[]): FunnelStepDef[] =>
  steps.filter((step) => step.value.trim().length > 0);

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
              pathname: `/session-replay/${encodeURIComponent(sessionId)}`,
            })}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              history.push({
                pathname: `/session-replay/${encodeURIComponent(sessionId)}`,
              });
            }}
          >
            {sessionId.slice(0, 8)}
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
            {i18n.translate('xpack.ux.patterns.inspectButtonLabel', {
              defaultMessage: 'Inspect',
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
    urlParams: { rangeFrom = 'now-24h', rangeTo = 'now', serviceName, kuery },
  } = useLegacyUrlParams();

  const [patterns, setPatterns] = useState<SessionPatternsResponse | null>(null);
  const [patternsLoading, setPatternsLoading] = useState(true);
  const [patternsError, setPatternsError] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [presetSteps, setPresetSteps] = useState<FunnelStepDef[] | null>(null);

  const loadPatterns = useCallback(async () => {
    setPatternsLoading(true);
    setPatternsError(null);
    try {
      const data = await fetchSessionPatterns({
        http,
        rangeFrom,
        rangeTo,
        serviceName: typeof serviceName === 'string' ? serviceName : undefined,
        kuery,
      });
      setPatterns(data);
    } catch (err) {
      setPatternsError(err instanceof Error ? err.message : String(err));
      setPatterns(null);
    } finally {
      setPatternsLoading(false);
    }
  }, [http, rangeFrom, rangeTo, serviceName, kuery]);

  useEffect(() => {
    void loadPatterns();
  }, [loadPatterns]);

  const inspect = (kind: PathPatternKind, steps: string[]) => {
    setPresetSteps(toFunnelSteps(kind, steps));
    setCustomOpen(true);
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
              'Recurring journeys mined from recent sessions. Open a pattern to land on those sessions, or inspect it as an ordered funnel.',
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
          iconType="visBarHorizontal"
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

      <EuiSpacer size="l" />
      <EuiAccordion
        id="uxCustomFunnel"
        arrowDisplay="left"
        forceState={customOpen ? 'open' : 'closed'}
        onToggle={(isOpen) => setCustomOpen(isOpen)}
        buttonContent={i18n.translate('xpack.ux.patterns.customFunnelButtonLabel', {
          defaultMessage: 'Custom conversion funnel',
        })}
        paddingSize="m"
      >
        <CustomFunnelEditor
          presetSteps={presetSteps}
          onPresetConsumed={() => setPresetSteps(null)}
        />
      </EuiAccordion>
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

function CustomFunnelEditor({
  presetSteps,
  onPresetConsumed,
}: {
  presetSteps: FunnelStepDef[] | null;
  onPresetConsumed: () => void;
}) {
  const { http } = useKibanaServices();
  const history = useHistory();
  const {
    urlParams: { rangeFrom = 'now-24h', rangeTo = 'now', serviceName, kuery },
  } = useLegacyUrlParams();

  const [steps, setSteps] = useState<FunnelStepDef[]>(DEFAULT_FUNNEL_STEPS);
  const [result, setResult] = useState<SessionFunnelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const runFunnel = useCallback(async () => {
    const toRun = usableSteps(stepsRef.current);
    if (toRun.length < FUNNEL_MIN_STEPS) {
      setResult(null);
      setError(
        i18n.translate('xpack.ux.funnels.minStepsErrorMessage', {
          defaultMessage: 'Add at least two steps with a page path or activity name.',
        })
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSessionFunnel({
        http,
        rangeFrom,
        rangeTo,
        serviceName: typeof serviceName === 'string' ? serviceName : undefined,
        steps: toRun,
        kuery,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [http, rangeFrom, rangeTo, serviceName, kuery]);

  useEffect(() => {
    if (!presetSteps) {
      return;
    }
    setSteps(presetSteps);
    stepsRef.current = presetSteps;
    onPresetConsumed();
    void runFunnel();
  }, [onPresetConsumed, presetSteps, runFunnel]);

  const startCount = result?.steps[0]?.count ?? 0;
  const lastCount = result?.steps.at(-1)?.count ?? 0;
  const maxCount = Math.max(startCount, 1);

  const updateStep = (index: number, patch: Partial<FunnelStepDef>) => {
    setSteps((current) => current.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  };

  return (
    <>
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.ux.funnels.description', {
            defaultMessage:
              'Count sessions that completed each step in order. Page matches URL path or hash; activity matches click targets (for example Add to cart, Checkout).',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      {steps.map((step, index) => (
        <EuiFlexGroup key={`step-${index}`} gutterSize="s" alignItems="flexEnd" responsive={false}>
          <EuiFlexItem grow={false} style={{ width: 140 }}>
            <EuiFormRow
              label={
                index === 0
                  ? i18n.translate('xpack.ux.funnels.stepTypeLabel', { defaultMessage: 'Type' })
                  : undefined
              }
            >
              <EuiSelect
                options={STEP_TYPE_OPTIONS}
                value={step.type}
                onChange={(e) => updateStep(index, { type: e.target.value as FunnelStepType })}
                compressed
                data-test-subj={`uxFunnelStepType-${index}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={
                index === 0
                  ? i18n.translate('xpack.ux.funnels.stepValueLabel', {
                      defaultMessage: 'Page or activity',
                    })
                  : undefined
              }
            >
              <EuiFieldText
                compressed
                value={step.value}
                maxLength={FUNNEL_STEP_VALUE_MAX_LENGTH}
                placeholder={
                  step.type === 'page'
                    ? i18n.translate('xpack.ux.funnels.pagePlaceholder', {
                        defaultMessage: 'catalog',
                      })
                    : i18n.translate('xpack.ux.funnels.activityPlaceholder', {
                        defaultMessage: 'Checkout',
                      })
                }
                onChange={(e) =>
                  updateStep(index, { value: e.target.value, label: e.target.value })
                }
                data-test-subj={`uxFunnelStepValue-${index}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.ux.funnels.removeStepTooltip', {
                defaultMessage: 'Remove step',
              })}
            >
              <EuiButtonIcon
                data-test-subj={`uxFunnelRemoveStep-${index}`}
                aria-label={i18n.translate('xpack.ux.funnels.removeStepAriaLabel', {
                  defaultMessage: 'Remove step',
                })}
                iconType="trash"
                color="danger"
                disabled={steps.length <= FUNNEL_MIN_STEPS}
                onClick={() => setSteps((current) => current.filter((_, i) => i !== index))}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}

      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="uxSessionFunnelPanelAddStepButton"
            size="s"
            iconType="plusInCircle"
            isDisabled={steps.length >= FUNNEL_MAX_STEPS}
            onClick={() =>
              setSteps((current) => [...current, { type: 'page', value: '', label: '' }])
            }
          >
            {i18n.translate('xpack.ux.funnels.addStepButtonLabel', { defaultMessage: 'Add step' })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            onClick={() => setSteps(DEFAULT_FUNNEL_STEPS)}
            data-test-subj="uxFunnelResetButton"
          >
            {i18n.translate('xpack.ux.funnels.resetButtonLabel', {
              defaultMessage: 'Shop preset',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill
            onClick={() => void runFunnel()}
            isLoading={loading}
            data-test-subj="uxFunnelRunButton"
          >
            {i18n.translate('xpack.ux.funnels.runButtonLabel', { defaultMessage: 'Run funnel' })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {error && (
        <>
          <EuiCallOut
            announceOnMount
            color="danger"
            size="s"
            title={i18n.translate('xpack.ux.funnels.errorTitle', {
              defaultMessage: 'Could not compute the funnel',
            })}
          >
            <p>{error}</p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {loading && !result ? (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              {i18n.translate('xpack.ux.funnels.loadingLabel', {
                defaultMessage: 'Computing funnel…',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : result && result.steps.length > 0 ? (
        <>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={String(startCount)}
                description={i18n.translate('xpack.ux.funnels.enteredStat', {
                  defaultMessage: 'Entered funnel',
                })}
                titleSize="s"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={percent(startCount === 0 ? 0 : lastCount / startCount)}
                description={i18n.translate('xpack.ux.funnels.convertedStat', {
                  defaultMessage: 'Completed all steps',
                })}
                titleSize="s"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={String(result.sessionsConsidered)}
                description={i18n.translate('xpack.ux.funnels.consideredStat', {
                  defaultMessage: 'Sessions scanned',
                })}
                titleSize="s"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />

          {result.steps.map((step, index) => (
            <div key={`${step.type}-${step.value}-${index}`}>
              {index > 0 && (
                <EuiText size="xs" color="subdued" style={{ margin: '4px 0 8px 0' }}>
                  {i18n.translate('xpack.ux.funnels.dropOffLabel', {
                    defaultMessage: '{count} dropped off ({rate} of previous step)',
                    values: {
                      count: step.dropOffCount,
                      rate: percent(1 - step.conversionFromPrevious),
                    },
                  })}
                  {step.sampleDroppedSessionIds.length > 0 && (
                    <>
                      {' · '}
                      {step.sampleDroppedSessionIds.map((sessionId, sIdx) => (
                        <span key={sessionId}>
                          {sIdx > 0 ? ', ' : ''}
                          <EuiLink
                            data-test-subj={`uxFunnelDroppedSession-${sessionId}`}
                            href={history.createHref({
                              pathname: `/session-replay/${encodeURIComponent(sessionId)}`,
                            })}
                            onClick={(e: React.MouseEvent) => {
                              e.preventDefault();
                              history.push({
                                pathname: `/session-replay/${encodeURIComponent(sessionId)}`,
                              });
                            }}
                          >
                            {sessionId.slice(0, 8)}
                          </EuiLink>
                        </span>
                      ))}
                    </>
                  )}
                </EuiText>
              )}
              <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                <EuiFlexItem grow={false} style={{ width: 160 }}>
                  <EuiText size="s">
                    <strong>{step.label}</strong>
                  </EuiText>
                  <EuiBadge color="hollow">
                    {step.type === 'page' ? STEP_TYPE_OPTIONS[0].text : STEP_TYPE_OPTIONS[1].text}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiProgress value={step.count} max={maxCount} color="primary" size="l" />
                </EuiFlexItem>
                <EuiFlexItem grow={false} style={{ minWidth: 120, textAlign: 'right' }}>
                  <EuiText size="s">
                    <strong>{step.count}</strong>
                    {' · '}
                    {percent(step.conversionFromStart)}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
            </div>
          ))}
        </>
      ) : null}
    </>
  );
}
