/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { rateVital, VITAL_RANK_THRESHOLDS } from '../../../../common/rum_app';
import { rumAppScoreInputs, type RumAppInventoryRow } from '../../../../common/rum_apps';
import {
  rumPerformanceScoreBand,
  rumPerformanceScoreBreakdown,
  rumScoreGaps,
  rumScoreStrengths,
  type RumScoreGap,
  type RumScoreVitalBreakdown,
} from '../../../../common/rum_performance_score';
import { pushRumPath } from '../../../utils/rum_search';
import { VITAL_HELP } from '../../../utils/vital_help';
import { VitalHelpLabel } from '../../../utils/vital_help_label';
import { useUxFlyoutSession, uxFlyoutProps } from '../../flyout/ux_flyout_props';
import {
  formatPercent,
  formatPercentPoints,
  formatVitalP75,
  performanceVitalLabel,
  ratingLabel,
  scoreBandLabel,
  scoreEmptyLabel,
} from './score_copy';
import { ScoreSparkline } from './score_sparkline';

const methodRanksLabel = i18n.translate('xpack.ux.scoreBreakdown.ranksMethodLabel', {
  defaultMessage: 'Histogram',
});

const methodP75Label = i18n.translate('xpack.ux.scoreBreakdown.p75MethodLabel', {
  defaultMessage: 'p75 fallback',
});

const RankBar = ({ good, ni, poor }: { good: number; ni: number; poor: number }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        height: ${euiTheme.size.xs};
        border-radius: ${euiTheme.border.radius.small};
        overflow: hidden;
        background: ${euiTheme.colors.lightShade};
      `}
    >
      {good > 0 ? <div style={{ width: `${good}%`, background: euiTheme.colors.success }} /> : null}
      {ni > 0 ? <div style={{ width: `${ni}%`, background: euiTheme.colors.warning }} /> : null}
      {poor > 0 ? <div style={{ width: `${poor}%`, background: euiTheme.colors.danger }} /> : null}
    </div>
  );
};

const vitalColor = (score: number): 'success' | 'warning' | 'danger' =>
  rumPerformanceScoreBand(score);

const gapCopy = (gap: RumScoreGap): string => {
  if (gap.kind === 'error') {
    return i18n.translate('xpack.ux.scoreBreakdown.errorGapDescription', {
      defaultMessage:
        '{rate} of sessions had errors and count as frustrated. Fixing them would raise the score from {score} to {recovered}.',
      values: {
        rate: formatPercent(gap.errorRate),
        score: gap.recoveredScore - gap.penalty,
        recovered: gap.recoveredScore,
      },
    });
  }
  if (gap.method === 'ranks' && gap.ranks) {
    return i18n.translate('xpack.ux.scoreBreakdown.vitalGapRanksDescription', {
      defaultMessage:
        '{poor} of {vital} views are poor and {ni} need improvement. Weight {weight} of the vitals average.',
      values: {
        poor: formatPercentPoints(gap.ranks.poor),
        ni: formatPercentPoints(gap.ranks.ni),
        vital: performanceVitalLabel(gap.name),
        weight: formatPercent(gap.weightShare),
      },
    });
  }
  const rating = rateVital(gap.name, gap.p75);
  return i18n.translate('xpack.ux.scoreBreakdown.vitalGapP75Description', {
    defaultMessage:
      'p75 {vital} is {value}{rating}. Histograms were not available, so the score used this percentile.',
    values: {
      vital: performanceVitalLabel(gap.name),
      value: formatVitalP75(gap.name, gap.p75),
      rating: rating ? ` (${ratingLabel(rating)})` : '',
    },
  });
};

const VitalCard = ({ vital }: { vital: RumScoreVitalBreakdown }) => {
  const p75Rating = rateVital(vital.name, vital.p75);
  return (
    <EuiPanel hasBorder paddingSize="s" data-test-subj={`uxScoreVital-${vital.name}`}>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <VitalHelpLabel
            label={performanceVitalLabel(vital.name)}
            tooltip={VITAL_HELP[vital.name]}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={vitalColor(vital.score)}>{Math.round(vital.score)}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {vital.ranks ? (
        <>
          <RankBar good={vital.ranks.good} ni={vital.ranks.ni} poor={vital.ranks.poor} />
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.ux.scoreBreakdown.ranksLegendDescription', {
              defaultMessage: '{good} good · {ni} needs improvement · {poor} poor',
              values: {
                good: formatPercentPoints(vital.ranks.good),
                ni: formatPercentPoints(vital.ranks.ni),
                poor: formatPercentPoints(vital.ranks.poor),
              },
            })}
          </EuiText>
        </>
      ) : null}
      <EuiSpacer size="s" />
      <EuiDescriptionList
        type="column"
        compressed
        listItems={[
          {
            title: i18n.translate('xpack.ux.scoreBreakdown.p75Label', { defaultMessage: 'p75' }),
            description:
              vital.p75 == null
                ? scoreEmptyLabel
                : `${formatVitalP75(vital.name, vital.p75)}${
                    p75Rating ? ` · ${ratingLabel(p75Rating)}` : ''
                  }`,
          },
          {
            title: i18n.translate('xpack.ux.scoreBreakdown.weightLabel', {
              defaultMessage: 'Weight',
            }),
            description: formatPercent(vital.weightShare),
          },
          {
            title: i18n.translate('xpack.ux.scoreBreakdown.methodLabel', {
              defaultMessage: 'Source',
            }),
            description: vital.method === 'ranks' ? methodRanksLabel : methodP75Label,
          },
        ]}
      />
    </EuiPanel>
  );
};

export function ScoreBreakdownFlyout({
  app,
  onClose,
}: {
  app: RumAppInventoryRow;
  onClose: () => void;
}) {
  const titleId = useGeneratedHtmlId();
  const history = useHistory();
  const flyoutSession = useUxFlyoutSession();
  const breakdown = useMemo(() => rumPerformanceScoreBreakdown(rumAppScoreInputs(app)), [app]);

  const flyoutTitle = i18n.translate('xpack.ux.scoreBreakdown.flyoutTitle', {
    defaultMessage: 'Score for {name}',
    values: { name: app.name },
  });

  const open = (suffix: string) => {
    pushRumPath(history, suffix, { serviceName: app.name });
    onClose();
  };

  const score = breakdown?.score ?? app.score;
  const vitalsScore = breakdown ? Math.round(breakdown.cwvScore) : null;
  const gaps = breakdown ? rumScoreGaps(breakdown) : [];
  const strengths = breakdown ? rumScoreStrengths(breakdown) : [];
  const goodTargets = (
    Object.keys(VITAL_RANK_THRESHOLDS) as Array<keyof typeof VITAL_RANK_THRESHOLDS>
  )
    .map((name) => {
      const { good } = VITAL_RANK_THRESHOLDS[name];
      return `${performanceVitalLabel(name)} ${formatVitalP75(name, good)}`;
    })
    .join(' · ');

  return (
    <EuiFlyout
      {...uxFlyoutProps({ title: flyoutTitle, session: flyoutSession })}
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="uxScoreBreakdownFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId} className="eui-textBreakWord">
            {flyoutTitle}
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.ux.scoreBreakdown.flyoutDescription', {
            defaultMessage:
              'Good views count fully, needs-improvement counts half, poor and error sessions count as frustrated. Google Core Web Vital thresholds are the targets.',
          })}
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {score != null ? (
          <EuiPanel hasBorder paddingSize="s">
            <EuiFlexGroup gutterSize="l" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiBadge color={rumPerformanceScoreBand(score)}>{score}</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ScoreSparkline
                  scores={app.scoreTrend}
                  score={score}
                  ariaLabel={i18n.translate('xpack.ux.scoreBreakdown.sparklineAriaLabel', {
                    defaultMessage: 'Score over the selected range',
                  })}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">{scoreBandLabel(score)}</EuiText>
                {vitalsScore != null && breakdown?.errorRate != null && vitalsScore !== score ? (
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.ux.scoreBreakdown.mathDescription', {
                      defaultMessage: '{vitals} from vitals × (1 − {rate} errors) = {score}',
                      values: {
                        vitals: vitalsScore,
                        rate: formatPercent(breakdown.errorRate),
                        score,
                      },
                    })}
                  </EuiText>
                ) : null}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        ) : null}

        <EuiSpacer />
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.ux.scoreBreakdown.improveTitle', {
              defaultMessage: 'What to improve',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {gaps.length === 0 ? (
          <EuiCallOut
            announceOnMount
            color="success"
            title={i18n.translate('xpack.ux.scoreBreakdown.noGapsTitle', {
              defaultMessage: 'Nothing is dragging this score down',
            })}
          >
            <p>
              {i18n.translate('xpack.ux.scoreBreakdown.noGapsDescription', {
                defaultMessage: 'Vitals in this range are in the good band, with no error penalty.',
              })}
            </p>
          </EuiCallOut>
        ) : (
          gaps.map((gap, index) => (
            <div key={gap.kind === 'error' ? 'error' : gap.name}>
              {index > 0 ? <EuiSpacer size="s" /> : null}
              <EuiCallOut
                announceOnMount
                color={
                  gap.kind === 'error' || (gap.kind === 'vital' && gap.score < 50)
                    ? 'danger'
                    : 'warning'
                }
                title={
                  gap.kind === 'error'
                    ? i18n.translate('xpack.ux.scoreBreakdown.errorGapTitle', {
                        defaultMessage: 'Errors (−{points})',
                        values: { points: gap.penalty },
                      })
                    : i18n.translate('xpack.ux.scoreBreakdown.vitalGapTitle', {
                        defaultMessage: '{vital} (−{points} on the vitals average)',
                        values: {
                          vital: performanceVitalLabel(gap.name),
                          points: Math.round(gap.drag),
                        },
                      })
                }
              >
                <p>{gapCopy(gap)}</p>
                {gap.kind === 'error' ? (
                  <EuiButtonEmpty
                    data-test-subj="uxScoreBreakdownFlyoutViewErrorsButton"
                    size="s"
                    flush="left"
                    onClick={() => open('/errors')}
                  >
                    {i18n.translate('xpack.ux.scoreBreakdown.viewErrorsButtonLabel', {
                      defaultMessage: 'View errors',
                    })}
                  </EuiButtonEmpty>
                ) : gap.name === 'lcp' || gap.name === 'inp' || gap.name === 'cls' ? (
                  <EuiButtonEmpty
                    data-test-subj="uxScoreBreakdownFlyoutViewPagesButton"
                    size="s"
                    flush="left"
                    onClick={() => open('/pages')}
                  >
                    {i18n.translate('xpack.ux.scoreBreakdown.viewPagesButtonLabel', {
                      defaultMessage: 'View pages',
                    })}
                  </EuiButtonEmpty>
                ) : null}
              </EuiCallOut>
            </div>
          ))
        )}

        {strengths.length > 0 ? (
          <>
            <EuiSpacer />
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.ux.scoreBreakdown.strengthsTitle', {
                  defaultMessage: 'What is already good',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s" wrap responsive={false}>
              {strengths.map((vital) => (
                <EuiFlexItem grow={false} key={vital.name}>
                  <EuiBadge color="success">
                    {i18n.translate('xpack.ux.scoreBreakdown.strengthBadgeLabel', {
                      defaultMessage: '{vital} {score}',
                      values: {
                        vital: performanceVitalLabel(vital.name),
                        score: Math.round(vital.score),
                      },
                    })}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        ) : null}

        <EuiHorizontalRule margin="m" />
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.ux.scoreBreakdown.vitalsTitle', {
              defaultMessage: 'What went into the score',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {breakdown && breakdown.vitals.length === 0 ? (
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.ux.scoreBreakdown.errorOnlyDescription', {
              defaultMessage:
                'No Core Web Vitals in this range. The score is 100 minus the share of sessions with errors.',
            })}
          </EuiText>
        ) : (
          <EuiFlexGroup direction="column" gutterSize="s">
            {breakdown?.vitals.map((vital) => (
              <EuiFlexItem key={vital.name}>
                <VitalCard vital={vital} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
        {breakdown && breakdown.missing.length > 0 && breakdown.vitals.length > 0 ? (
          <>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.ux.scoreBreakdown.missingDescription', {
                defaultMessage: 'Not in this score (weights renormalized): {vitals}.',
                values: {
                  vitals: i18n.formatList(
                    'conjunction',
                    breakdown.missing.map(performanceVitalLabel)
                  ),
                },
              })}
            </EuiText>
          </>
        ) : null}
        <EuiSpacer size="m" />
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.ux.scoreBreakdown.thresholdsDescription', {
            defaultMessage: 'Good targets: {thresholds}.',
            values: { thresholds: goodTargets },
          })}
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="uxScoreBreakdownCloseButton">
              {i18n.translate('xpack.ux.scoreBreakdown.closeButtonLabel', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="uxScoreBreakdownFlyoutPagesButton"
                  onClick={() => open('/pages')}
                >
                  {i18n.translate('xpack.ux.scoreBreakdown.pagesButtonLabel', {
                    defaultMessage: 'Pages',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="uxScoreBreakdownFlyoutOverviewButton"
                  onClick={() => open('/')}
                  fill
                >
                  {i18n.translate('xpack.ux.scoreBreakdown.overviewButtonLabel', {
                    defaultMessage: 'Overview',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
