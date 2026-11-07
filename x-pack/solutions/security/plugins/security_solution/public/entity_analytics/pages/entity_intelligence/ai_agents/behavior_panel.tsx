/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IntelligencePanel } from '../components';
import type { AgentBehaviorAnalysis, BehaviorFinding, BehaviorFindingKind } from './behavior_types';
import { behaviorLabels, comparisonLabel, findingDescription } from './behavior_presentation';
import { AgentTimestamp } from './agent_evidence';

const percent = (value: number): string => `${Math.round(value * 100)}%`;
const priority: Record<BehaviorFindingKind, number> = {
  failure_rate_increase: 0,
  repeated_tool_failures: 1,
  tool_volume_increase: 2,
  duration_increase: 3,
  new_tool: 4,
};
const failureKinds: BehaviorFindingKind[] = ['failure_rate_increase', 'repeated_tool_failures'];

const ComparisonBars: React.FC<{
  baseline?: number;
  current?: number;
  maximum?: number;
  format?: (value: number) => string;
}> = ({ baseline, current, maximum, format = (value) => Math.round(value).toLocaleString() }) => {
  const { euiTheme } = useEuiTheme();
  const max = maximum ?? Math.max(baseline ?? 0, current ?? 0, 1);
  return (
    <div
      css={css`
        display: grid;
        gap: ${euiTheme.size.xs};
        margin-top: ${euiTheme.size.s};
      `}
    >
      {[
        {
          label: i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.behavior.prior',
            { defaultMessage: 'Baseline' }
          ),
          value: baseline,
          color: euiTheme.colors.mediumShade,
        },
        {
          label: i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.behavior.current',
            { defaultMessage: 'Current' }
          ),
          value: current,
          color: euiTheme.colors.primary,
        },
      ].map(({ label, value, color }) => (
        <div
          key={label}
          css={css`
            display: grid;
            grid-template-columns: 54px 1fr 42px;
            align-items: center;
            gap: ${euiTheme.size.s};
            font-size: 11px;
            color: ${euiTheme.colors.textSubdued};
          `}
        >
          <span>{label}</span>
          <div
            aria-hidden="true"
            css={css`
              height: 6px;
              border-radius: 3px;
              overflow: hidden;
              background: ${euiTheme.colors.lightestShade};
            `}
          >
            <div
              style={{
                width: `${Math.min(100, Math.max(0, ((value ?? 0) / max) * 100))}%`,
                background: color,
                height: '100%',
              }}
            />
          </div>
          <span
            css={css`
              text-align: right;
              font-variant-numeric: tabular-nums;
            `}
          >
            {value === undefined ? '—' : format(value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export const BehaviorPanel: React.FC<{
  analysis: AgentBehaviorAnalysis;
  baselineContent?: React.ReactNode;
  onInspect: (finding: BehaviorFinding) => void;
  onSelectTool?: (name: string) => void;
}> = ({ analysis, onInspect, baselineContent, onSelectTool }) => {
  const { euiTheme } = useEuiTheme();
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(false);
  const { baseline, current, comparisons } = analysis;
  const findings = [...analysis.findings].sort(
    (left, right) => priority[left.kind] - priority[right.kind]
  );
  const visibleFindings = findings.filter(
    (finding) =>
      filter === 'all' ||
      (filter === 'failures'
        ? failureKinds.includes(finding.kind)
        : !failureKinds.includes(finding.kind))
  );
  const compared = Object.values(comparisons).filter((item) => item.status === 'evaluated').length;
  const complete = baseline.coverage === 'complete' && current.coverage === 'complete';
  const baselineFailureRate = baseline.knownOutcomeCount
    ? baseline.failureCount / baseline.knownOutcomeCount
    : undefined;
  const currentFailureRate = current.knownOutcomeCount
    ? current.failureCount / current.knownOutcomeCount
    : undefined;
  const panelStyle = css`
    padding: ${euiTheme.size.m};
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    min-width: 0;
  `;
  const metricStyle = css`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: ${euiTheme.size.m};
    @media (max-width: 760px) {
      grid-template-columns: 1fr;
    }
  `;
  const unitLabel =
    analysis.unitKind === 'session'
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.behavior.sessionsInBaseline',
          {
            defaultMessage: '{count, number} matched earlier sessions',
            values: { count: baseline.unitCount },
          }
        )
      : i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.behavior.invocationsInBaseline',
          {
            defaultMessage: '{count, number} matched earlier invocations',
            values: { count: baseline.unitCount },
          }
        );
  return (
    <IntelligencePanel
      accentColor={findings.length ? euiTheme.colors.warning : euiTheme.colors.primary}
      data-test-subj="agentBehaviorPanel"
    >
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m" wrap>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>
              <EuiIcon type="chartAnomaly" color="primary" aria-hidden={true} />{' '}
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.behavior.title',
                { defaultMessage: 'Behavior signals' }
              )}
            </h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <p>
              {unitLabel}
              {' · '}{' '}
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.behavior.rulesCompared',
                {
                  defaultMessage: '{count} of 5 checks fully evaluated',
                  values: { count: compared },
                }
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={findings.length ? 'warning' : 'hollow'}>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.behavior.findingCount',
              {
                defaultMessage: '{count, number} {count, plural, one {finding} other {findings}}',
                values: { count: findings.length },
              }
            )}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <div css={metricStyle}>
        <div css={panelStyle}>
          <EuiText size="xs">
            <strong>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.behavior.failureMetric',
                { defaultMessage: 'Failure rate' }
              )}
            </strong>
          </EuiText>
          <ComparisonBars
            baseline={baselineFailureRate}
            current={currentFailureRate}
            maximum={1}
            format={percent}
          />
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {comparisonLabel(comparisons.failure_rate_increase.status)}
          </EuiText>
        </div>
        <div css={panelStyle}>
          <EuiText size="xs">
            <strong>
              {analysis.unitKind === 'session'
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.behavior.meanSessionVolume',
                    { defaultMessage: 'Mean observations / session' }
                  )
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.behavior.meanInvocationVolume',
                    { defaultMessage: 'Mean observations / invocation' }
                  )}
            </strong>
          </EuiText>
          <ComparisonBars
            baseline={baseline.unitCount ? baseline.toolCallCount / baseline.unitCount : undefined}
            current={current.unitCount ? current.toolCallCount / current.unitCount : undefined}
          />
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {comparisonLabel(comparisons.tool_volume_increase.status)}
          </EuiText>
        </div>
        <div css={panelStyle}>
          <EuiText size="xs">
            <strong>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.behavior.outcomeVisibility',
                { defaultMessage: 'Known outcomes' }
              )}
            </strong>
          </EuiText>
          <ComparisonBars
            baseline={
              baseline.toolCallCount
                ? baseline.knownOutcomeCount / baseline.toolCallCount
                : undefined
            }
            current={
              current.toolCallCount ? current.knownOutcomeCount / current.toolCallCount : undefined
            }
            maximum={1}
            format={percent}
          />
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.behavior.unknownCount',
              {
                defaultMessage: '{count, number} current outcomes unknown',
                values: { count: current.unknownOutcomeCount },
              }
            )}
          </EuiText>
        </div>
      </div>
      <EuiSpacer size="m" />
      {findings.length > 0 ? (
        <>
          <EuiButtonGroup
            legend={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.behavior.filterLegend',
              { defaultMessage: 'Filter behavior signals' }
            )}
            buttonSize="compressed"
            idSelected={filter}
            onChange={setFilter}
            options={[
              {
                id: 'all',
                label: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.behavior.allSignals',
                  { defaultMessage: 'All signals' }
                ),
              },
              {
                id: 'failures',
                label: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.behavior.reliability',
                  { defaultMessage: 'Reliability' }
                ),
              },
              {
                id: 'changes',
                label: i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.behavior.toolChanges',
                  { defaultMessage: 'Tool use & volume' }
                ),
              },
            ]}
          />
          <EuiSpacer size="s" />
          {visibleFindings.slice(0, expanded ? visibleFindings.length : 4).map((finding) => (
            <div
              key={finding.id}
              css={css`
                display: grid;
                grid-template-columns: 32px minmax(0, 1fr) auto;
                gap: ${euiTheme.size.m};
                align-items: center;
                padding: ${euiTheme.size.m};
                margin-bottom: ${euiTheme.size.s};
                border-radius: ${euiTheme.border.radius.medium};
                background: ${transparentize(euiTheme.colors.warning, 0.05)};
                border: ${euiTheme.border.thin};
              `}
            >
              <EuiIcon
                type={
                  failureKinds.includes(finding.kind)
                    ? 'warning'
                    : finding.kind === 'new_tool'
                    ? 'gear'
                    : 'chartAnomaly'
                }
                color={failureKinds.includes(finding.kind) ? 'danger' : 'warning'}
                size="l"
                aria-hidden={true}
              />
              <div>
                <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <strong>{behaviorLabels[finding.kind]}</strong>
                    </EuiText>
                  </EuiFlexItem>
                  {finding.toolName && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">{finding.toolName}</EuiBadge>
                    </EuiFlexItem>
                  )}
                  {finding.sampleBased && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="warning">
                        {i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.behavior.partialFinding',
                          { defaultMessage: 'Partial evidence' }
                        )}
                      </EuiBadge>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
                <EuiText size="xs" color="subdued">
                  <p>{findingDescription(finding)}</p>
                </EuiText>
              </div>
              <EuiButtonEmpty size="xs" iconType="inspect" onClick={() => onInspect(finding)}>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.behavior.inspectEvidence',
                  { defaultMessage: 'Inspect evidence' }
                )}
              </EuiButtonEmpty>
            </div>
          ))}
          {!visibleFindings.length && (
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.behavior.noFilterSignals',
                  { defaultMessage: 'No signals in this category.' }
                )}
              </p>
            </EuiText>
          )}
          {visibleFindings.length > 4 && (
            <EuiButtonEmpty size="xs" onClick={() => setExpanded(!expanded)}>
              {expanded
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.behavior.showLess',
                    { defaultMessage: 'Show fewer findings' }
                  )
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.behavior.showMore',
                    {
                      defaultMessage: 'Show {count, number} more findings',
                      values: { count: visibleFindings.length - 4 },
                    }
                  )}
            </EuiButtonEmpty>
          )}
        </>
      ) : (
        <EuiText size="s" color="subdued">
          <p>
            {compared > 0
              ? i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.behavior.noComparedFindings',
                  {
                    defaultMessage:
                      'No signals in the checks that could be evaluated. Coverage below explains the remaining checks.',
                  }
                )
              : i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.behavior.notReady',
                  { defaultMessage: 'More evidence needed for comparison.' }
                )}
          </p>
        </EuiText>
      )}
      {analysis.toolProfiles.some((tool) => tool.currentCount > 0) && (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.behavior.toolMix',
                { defaultMessage: 'How tool use changed' }
              )}
            </h4>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.behavior.toolMixDescription',
                {
                  defaultMessage:
                    'Share of observed activity. Gray is baseline; blue is current. Changes are context, not a verdict.',
                }
              )}
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <div css={metricStyle}>
            {analysis.toolProfiles
              .filter((tool) => tool.currentCount > 0)
              .slice(0, 6)
              .map((tool) => (
                <div key={tool.name} css={panelStyle}>
                  <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="spaceBetween">
                    <EuiFlexItem
                      css={css`
                        min-width: 0;
                      `}
                    >
                      {onSelectTool ? (
                        <EuiButtonEmpty
                          size="xs"
                          flush="left"
                          onClick={() => onSelectTool(tool.name)}
                          title={tool.name}
                        >
                          {tool.name}
                        </EuiButtonEmpty>
                      ) : (
                        <EuiText size="xs">
                          <strong>{tool.name}</strong>
                        </EuiText>
                      )}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {complete &&
                      comparisons.new_tool.status === 'evaluated' &&
                      tool.baselineCount === 0 ? (
                        <EuiBadge color="warning">
                          {i18n.translate(
                            'xpack.securitySolution.entityAnalytics.intelligence.behavior.new',
                            { defaultMessage: 'New' }
                          )}
                        </EuiBadge>
                      ) : (
                        <EuiText size="xs" color="subdued">
                          {tool.currentCount.toLocaleString()}
                        </EuiText>
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <ComparisonBars
                    baseline={baseline.toolCallCount ? tool.baselineShare : undefined}
                    current={tool.currentShare}
                    maximum={1}
                    format={percent}
                  />
                </div>
              ))}
          </div>
        </>
      )}
      <EuiSpacer size="m" />
      <EuiAccordion
        id={`behavior-method-${analysis.agentId}`}
        buttonContent={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.behavior.method',
          { defaultMessage: 'Baseline & detection coverage' }
        )}
        paddingSize="m"
      >
        <EuiText size="xs">
          <p>
            <AgentTimestamp value={baseline.start} />
            {' → '}
            <AgentTimestamp value={baseline.end} />
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        {baselineContent}
        <EuiSpacer size="m" />
        {(Object.keys(comparisons) as BehaviorFindingKind[]).map((kind) => (
          <EuiFlexGroup key={kind} gutterSize="s" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiText size="xs">{behaviorLabels[kind]}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {comparisonLabel(comparisons[kind].status)}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ))}
        <EuiSpacer size="m" />
        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.behavior.methodDetail',
              {
                defaultMessage:
                  'Novel tools and volume require at least {units} baseline sessions. Failure-rate drift requires {baseline} baseline and {current} current known outcomes, an increase of {points} percentage points and {ratio}×. Volume must exceed {volume}× the median and the baseline 95th percentile. Repeated failures require {failures} observations within {minutes} minutes.',
                values: {
                  units: analysis.rules.minimumBaselineUnits,
                  baseline: analysis.rules.minimumBaselineKnownOutcomes,
                  current: analysis.rules.minimumCurrentKnownOutcomes,
                  points: Math.round(analysis.rules.failureRateIncrease * 100),
                  ratio: analysis.rules.failureRateRatio,
                  volume: analysis.rules.volumeRatio,
                  failures: analysis.rules.repeatedFailures,
                  minutes: analysis.rules.repeatedFailureWindowMs / 60000,
                },
              }
            )}
          </p>
          <p>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.behavior.comparisonCaveat',
              {
                defaultMessage:
                  'Unknown outcomes are excluded from failure rates. Volume compares accumulated observations, so task length and workload can explain changes. Resumable sessions have no trustworthy completion duration.',
              }
            )}
          </p>
        </EuiText>
      </EuiAccordion>
    </IntelligencePanel>
  );
};
