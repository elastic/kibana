/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
  EuiProgress,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';

type ContinuousHuntDisplayState = 'new_findings' | 'quiet' | 'hunting';

const ACTIVITY_SPARKLINE_24H = [
  3, 5, 4, 8, 6, 12, 7, 9, 5, 11, 4, 10, 8, 6, 9, 7, 11, 5, 8, 10, 4, 7, 9, 6,
];
const QUIET_SPARKLINE_24H = ACTIVITY_SPARKLINE_24H.map((v) => Math.max(1, Math.round(v * 0.35)));

const pulseKeyframes = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
`;

const pulseStyle = css`
  animation: ${pulseKeyframes} 1.6s ease-in-out infinite;
`;

/** Shared row heights so heading / meta lines align across columns. */
const HEADING_ROW_HEIGHT = 24;
const META_ROW_HEIGHT = 24;
const ROW_GAP = 8;
const STRIP_CONTENT_HEIGHT = HEADING_ROW_HEIGHT + ROW_GAP + META_ROW_HEIGHT;
const SPARKLINE_BAR_HEIGHT = 20;

const clickablePanelStyle = css`
  cursor: pointer;
`;

const metaDot = ' · ';

const columnGridCss = css({
  display: 'grid',
  gridTemplateRows: `${HEADING_ROW_HEIGHT}px ${META_ROW_HEIGHT}px`,
  rowGap: ROW_GAP,
  alignItems: 'center',
  minHeight: STRIP_CONTENT_HEIGHT,
});

interface BarSparklineProps {
  values: number[];
  label: string;
  testSubj: string;
  quiet?: boolean;
  badge?: React.ReactNode;
}

const BarSparklineComponent: React.FC<BarSparklineProps> = ({
  values,
  label,
  testSubj,
  quiet = false,
  badge,
}) => {
  const { euiTheme } = useEuiTheme();
  const max = Math.max(...values, 1);

  const barsCss = css({
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 2,
    height: SPARKLINE_BAR_HEIGHT,
    minWidth: 120,
  });

  const barCss = (value: number, index: number) => {
    const intensity = value / max;
    return css({
      flex: '1 1 0',
      maxWidth: 5,
      minHeight: 2,
      height: `${Math.max(6, intensity * 100)}%`,
      backgroundColor: quiet
        ? euiTheme.colors.mediumShade
        : index < values.length * 0.45
        ? euiTheme.colors.lightShade
        : euiTheme.colors.primary,
      borderRadius: 1,
      opacity: quiet ? 0.55 : 0.55 + intensity * 0.45,
    });
  };

  return (
    <div data-test-subj={testSubj} css={columnGridCss}>
      <div css={barsCss} aria-hidden="true">
        {values.map((value, index) => (
          <div key={`bar-${index}`} css={barCss(value, index)} />
        ))}
      </div>
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        justifyContent="flexEnd"
        responsive={false}
        wrap={false}
      >
        {badge ? <EuiFlexItem grow={false}>{badge}</EuiFlexItem> : null}
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {label}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

const BarSparkline = React.memo(BarSparklineComponent);

const useColumnDividerCss = () => {
  const { euiTheme } = useEuiTheme();
  return css({
    paddingLeft: euiTheme.size.l,
    paddingRight: euiTheme.size.l,
    borderLeft: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
  });
};

const ContinuousHuntLeftColumn: React.FC<{ lastRun: string; nextRun: string }> = ({
  lastRun,
  nextRun,
}) => {
  const { euiTheme } = useEuiTheme();

  const activeStatusLabel = i18n.translate(
    'xpack.securitySolution.threatIntelligence.app.continuousHuntActiveStatus',
    { defaultMessage: 'Continuous hunt active' }
  );

  const reportsHuntedBadge = i18n.translate(
    'xpack.securitySolution.threatIntelligence.app.continuousHuntReportsHuntedBadge',
    { defaultMessage: '10 reports hunted' }
  );

  return (
    <div data-test-subj="threatIntelContinuousHuntLeftColumn" css={columnGridCss}>
      <EuiHealth color="success">
        <EuiText size="s" css={css({ color: euiTheme.colors.success, lineHeight: 1.2 })}>
          <strong>{activeStatusLabel}</strong>
        </EuiText>
      </EuiHealth>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" data-test-subj="threatIntelContinuousHuntCycleStats">
            {reportsHuntedBadge}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {lastRun}
            {metaDot}
            {nextRun}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

const ContinuousHuntStatusStripComponent: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const [displayState, setDisplayState] = useState<ContinuousHuntDisplayState>('new_findings');
  const columnDividerCss = useColumnDividerCss();

  const cycleState = useCallback(() => {
    setDisplayState((current) => {
      if (current === 'new_findings') {
        return 'quiet';
      }
      if (current === 'quiet') {
        return 'hunting';
      }
      return 'new_findings';
    });
  }, []);

  const sparklineLabel = i18n.translate(
    'xpack.securitySolution.threatIntelligence.app.continuousHuntActivitySparklineLabel',
    { defaultMessage: 'Activity · 24h' }
  );

  const thisCycleLabel = i18n.translate(
    'xpack.securitySolution.threatIntelligence.app.continuousHuntThisCycle',
    { defaultMessage: 'This cycle' }
  );

  const huntingReportTitle = i18n.translate(
    'xpack.securitySolution.threatIntelligence.app.continuousHuntSampleReportTitle',
    { defaultMessage: 'Okta identity takeover' }
  );

  const huntingSubtitle = i18n.translate(
    'xpack.securitySolution.threatIntelligence.app.continuousHuntHuntingSubtitle',
    {
      defaultMessage: 'Tier 1 sweep complete (12 IOC hits) · Tier 2 extracting behaviors...',
    }
  );

  const reportProgressLabel = i18n.translate(
    'xpack.securitySolution.threatIntelligence.app.continuousHuntReportProgress',
    {
      defaultMessage: 'Report {current} of {total} in this cycle',
      values: { current: 2, total: 4 },
    }
  );

  const startedAgoLabel = i18n.translate(
    'xpack.securitySolution.threatIntelligence.app.continuousHuntStartedAgo',
    { defaultMessage: 'Started 38s ago' }
  );

  const tierProgressLabel = i18n.translate(
    'xpack.securitySolution.threatIntelligence.app.continuousHuntTierOfTotal',
    {
      defaultMessage: 'Tier {current} of {total}',
      values: { current: 2, total: 2 },
    }
  );

  const sparklineValues = useMemo(() => {
    if (displayState === 'quiet') {
      return QUIET_SPARKLINE_24H;
    }
    return ACTIVITY_SPARKLINE_24H;
  }, [displayState]);

  const quietBadge = (
    <EuiBadge color="hollow" data-test-subj="threatIntelContinuousHuntQuietPill">
      {i18n.translate('xpack.securitySolution.threatIntelligence.app.continuousHuntQuietPill', {
        defaultMessage: 'quiet',
      })}
    </EuiBadge>
  );

  // Match the page header / template background (lighter than lightestShade panels).
  const stripPanelCss = css({
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
  });

  const huntingPanelCss = css({
    borderColor: euiTheme.colors.primary,
  });

  const huntingDotCss = css({
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: euiTheme.colors.primary,
    marginRight: euiTheme.size.s,
    flexShrink: 0,
  });

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      data-test-subj="threatIntelContinuousHuntStatusStrip"
      css={[
        clickablePanelStyle,
        stripPanelCss,
        displayState === 'hunting' ? pulseStyle : undefined,
        displayState === 'hunting' ? huntingPanelCss : undefined,
      ]}
      onClick={cycleState}
      role="button"
      tabIndex={0}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          cycleState();
        }
      }}
    >
      {displayState === 'hunting' ? (
        <EuiFlexGroup alignItems="flexStart" responsive={false} gutterSize="none">
          <EuiFlexItem grow={2}>
            <div css={columnGridCss}>
              <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <span css={huntingDotCss} aria-hidden />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText
                    size="s"
                    css={css({ color: euiTheme.colors.primary, lineHeight: 1.2 })}
                  >
                    <strong data-test-subj="threatIntelContinuousHuntHuntingTitle">
                      {i18n.translate(
                        'xpack.securitySolution.threatIntelligence.app.continuousHuntHuntingNow',
                        {
                          defaultMessage: 'Hunting now: {reportTitle}',
                          values: { reportTitle: huntingReportTitle },
                        }
                      )}
                    </strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiText
                size="xs"
                color="subdued"
                data-test-subj="threatIntelContinuousHuntHuntingSub"
              >
                {huntingSubtitle}
              </EuiText>
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={2} css={columnDividerCss}>
            <div css={columnGridCss}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem>
                  <EuiProgress
                    value={65}
                    max={100}
                    size="s"
                    color="primary"
                    data-test-subj="threatIntelContinuousHuntTierProgress"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {tierProgressLabel}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiText size="xs" color="subdued">
                {thisCycleLabel}
              </EuiText>
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={1} css={columnDividerCss}>
            <div css={[columnGridCss, css({ textAlign: 'right' })]}>
              <EuiText size="s" css={css({ lineHeight: 1.2 })}>
                <strong data-test-subj="threatIntelContinuousHuntReportProgress">
                  {reportProgressLabel}
                </strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                {startedAgoLabel}
              </EuiText>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiFlexGroup alignItems="flexStart" responsive={false} gutterSize="none">
          <EuiFlexItem grow={1}>
            <ContinuousHuntLeftColumn
              lastRun={
                displayState === 'quiet'
                  ? i18n.translate(
                      'xpack.securitySolution.threatIntelligence.app.continuousHuntLastRunQuiet',
                      { defaultMessage: 'Last run 6 min ago' }
                    )
                  : i18n.translate(
                      'xpack.securitySolution.threatIntelligence.app.continuousHuntLastRun',
                      { defaultMessage: 'Last run 14 min ago' }
                    )
              }
              nextRun={
                displayState === 'quiet'
                  ? i18n.translate(
                      'xpack.securitySolution.threatIntelligence.app.continuousHuntNextRunQuiet',
                      { defaultMessage: 'Next in 54 min' }
                    )
                  : i18n.translate(
                      'xpack.securitySolution.threatIntelligence.app.continuousHuntNextRun',
                      { defaultMessage: 'Next in 46 min' }
                    )
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1} css={columnDividerCss}>
            {displayState === 'new_findings' ? (
              <div data-test-subj="threatIntelContinuousHuntMiddleNewFindings" css={columnGridCss}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
                  <EuiFlexItem grow={false}>
                    <EuiBadge
                      color="warning"
                      data-test-subj="threatIntelContinuousHuntNewFindingsBadge"
                    >
                      {i18n.translate(
                        'xpack.securitySolution.threatIntelligence.app.continuousHuntNewFindingsBadge',
                        { defaultMessage: '3 new findings' }
                      )}
                    </EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText
                      size="xs"
                      color="subdued"
                      data-test-subj="threatIntelContinuousHuntSuppressed"
                    >
                      {i18n.translate(
                        'xpack.securitySolution.threatIntelligence.app.continuousHuntSuppressedCount',
                        { defaultMessage: '1 duplicate suppressed' }
                      )}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiText size="xs" color="subdued">
                  {thisCycleLabel}
                </EuiText>
              </div>
            ) : (
              <div data-test-subj="threatIntelContinuousHuntQuietMessage" css={columnGridCss}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="success">
                      {i18n.translate(
                        'xpack.securitySolution.threatIntelligence.app.continuousHuntNoNewFindingsBadge',
                        { defaultMessage: 'No new findings' }
                      )}
                    </EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {i18n.translate(
                        'xpack.securitySolution.threatIntelligence.app.continuousHuntIndicatorsRechecked',
                        { defaultMessage: 'All 12 known indicators re-checked' }
                      )}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiText size="xs" color="subdued">
                  {thisCycleLabel}
                </EuiText>
              </div>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={columnDividerCss}>
            <BarSparkline
              values={sparklineValues}
              label={sparklineLabel}
              testSubj="threatIntelContinuousHuntSparkline"
              quiet={displayState === 'quiet'}
              badge={displayState === 'quiet' ? quietBadge : undefined}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};

export const ContinuousHuntStatusStrip = React.memo(ContinuousHuntStatusStripComponent);
