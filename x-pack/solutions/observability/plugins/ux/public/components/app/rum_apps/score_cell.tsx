/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { EuiDescriptionListProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { rumAppScoreInputs, type RumAppInventoryRow } from '../../../../common/rum_apps';
import {
  rumPerformanceScoreBand,
  rumPerformanceScoreBreakdown,
  rumScoreGaps,
} from '../../../../common/rum_performance_score';
import { ScoreSparkline } from './score_sparkline';
import {
  formatPercent,
  performanceVitalLabel,
  scoreBandLabel,
  scoreEmptyLabel,
} from './score_copy';

const scoreColumnLabel = i18n.translate('xpack.ux.inventory.scoreColumnLabel', {
  defaultMessage: 'Score',
});

const scoreScaleDescription = i18n.translate('xpack.ux.inventory.scoreScaleDescription', {
  defaultMessage: '90+ good · 50–89 needs improvement · <50 poor',
});

const viewBreakdownButtonLabel = i18n.translate(
  'xpack.ux.inventory.scoreViewBreakdownButtonLabel',
  { defaultMessage: 'View breakdown' }
);

function ScoreHoverPopover({
  title,
  button,
  items,
  onOpen,
}: {
  title: string;
  button: React.ReactElement;
  items: EuiDescriptionListProps['listItems'];
  onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number>();
  const openNow = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 300);
  };
  const openFlyout = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    window.clearTimeout(closeTimer.current);
    setOpen(false);
    onOpen();
  };

  useEffect(
    () => () => {
      window.clearTimeout(closeTimer.current);
    },
    []
  );

  return (
    <EuiPopover
      aria-label={title}
      isOpen={open}
      closePopover={() => setOpen(false)}
      ownFocus={false}
      panelPaddingSize="s"
      anchorPosition="upCenter"
      button={
        <span onMouseEnter={openNow} onMouseLeave={closeSoon}>
          {button}
        </span>
      }
      panelStyle={{ cursor: 'pointer' }}
      panelProps={{
        onMouseEnter: openNow,
        onMouseLeave: closeSoon,
        onMouseDown: openFlyout,
      }}
    >
      <div style={{ minWidth: 220, maxWidth: 280 }}>
        <EuiPopoverTitle paddingSize="s">{title}</EuiPopoverTitle>
        <EuiDescriptionList type="column" compressed listItems={items} />
        <EuiSpacer size="s" />
        <EuiButton
          size="s"
          fullWidth
          onMouseDown={openFlyout}
          data-test-subj="uxInventoryScoreViewBreakdown"
        >
          {viewBreakdownButtonLabel}
        </EuiButton>
      </div>
    </EuiPopover>
  );
}

const DeltaText = ({ value }: { value: number | null }) => {
  if (value == null || value === 0) {
    return null;
  }
  return (
    <EuiText size="xs" color={value < 0 ? 'danger' : 'success'}>
      {value > 0 ? '+' : ''}
      {Math.round(value)}
    </EuiText>
  );
};

export function InventoryScoreCell({
  app,
  onOpen,
}: {
  app: RumAppInventoryRow;
  onOpen: (next: RumAppInventoryRow) => void;
}) {
  const score = app.score;
  const breakdown = useMemo(
    () => (score == null ? null : rumPerformanceScoreBreakdown(rumAppScoreInputs(app))),
    [app, score]
  );

  if (score == null || breakdown == null) {
    return (
      <EuiText size="s" color="subdued">
        {scoreEmptyLabel}
      </EuiText>
    );
  }

  const vitalsScore = Math.round(breakdown.cwvScore);
  const gaps = rumScoreGaps(breakdown);
  const topGap = gaps[0];
  const histogram = breakdown.vitals
    .filter((vital) => vital.method === 'ranks')
    .map((vital) => performanceVitalLabel(vital.name));
  const p75Only = breakdown.vitals
    .filter((vital) => vital.method === 'p75')
    .map((vital) => performanceVitalLabel(vital.name));
  const items: EuiDescriptionListProps['listItems'] = [
    {
      title: i18n.translate('xpack.ux.inventory.scoreRatingLabel', { defaultMessage: 'Rating' }),
      description: scoreBandLabel(score),
    },
    {
      title: i18n.translate('xpack.ux.inventory.scoreVitalsLabel', {
        defaultMessage: 'Core Web Vitals',
      }),
      description: String(vitalsScore),
    },
  ];
  if (breakdown.errorRate != null && vitalsScore !== score) {
    items.push({
      title: i18n.translate('xpack.ux.inventory.scoreErrorPenaltyLabel', {
        defaultMessage: 'Error penalty',
      }),
      description: i18n.translate('xpack.ux.inventory.scoreErrorPenaltyDescription', {
        defaultMessage: '−{points} ({rate} of sessions)',
        values: { points: vitalsScore - score, rate: formatPercent(breakdown.errorRate) },
      }),
    });
  }
  if (topGap?.kind === 'vital') {
    items.push({
      title: i18n.translate('xpack.ux.inventory.scoreBiggestGapLabel', {
        defaultMessage: 'Biggest gap',
      }),
      description: `${performanceVitalLabel(topGap.name)} · ${Math.round(topGap.score)}`,
    });
  } else if (topGap?.kind === 'error') {
    items.push({
      title: i18n.translate('xpack.ux.inventory.scoreBiggestGapLabel', {
        defaultMessage: 'Biggest gap',
      }),
      description: i18n.translate('xpack.ux.inventory.scoreErrorGapLabel', {
        defaultMessage: 'Errors · {rate}',
        values: { rate: formatPercent(topGap.errorRate) },
      }),
    });
  }
  if (histogram.length > 0 || p75Only.length > 0) {
    items.push({
      title: i18n.translate('xpack.ux.inventory.scoreInputsLabel', { defaultMessage: 'Used' }),
      description: [
        histogram.length > 0
          ? i18n.translate('xpack.ux.inventory.scoreHistogramInputsDescription', {
              defaultMessage: '{vitals} histogram',
              values: { vitals: i18n.formatList('conjunction', histogram) },
            })
          : null,
        p75Only.length > 0
          ? i18n.translate('xpack.ux.inventory.scoreP75InputsDescription', {
              defaultMessage: '{vitals} p75',
              values: { vitals: i18n.formatList('conjunction', p75Only) },
            })
          : null,
      ]
        .filter((part): part is string => part != null)
        .join(' · '),
    });
  }
  items.push({
    title: i18n.translate('xpack.ux.inventory.scoreScaleLabel', { defaultMessage: 'Scale' }),
    description: scoreScaleDescription,
  });

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <ScoreHoverPopover
          title={scoreColumnLabel}
          items={items}
          onOpen={() => onOpen(app)}
          button={
            <EuiBadge
              color={rumPerformanceScoreBand(score)}
              data-test-subj={`uxInventoryScoreBadge-${app.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onOpen(app);
              }}
              onClickAriaLabel={i18n.translate('xpack.ux.inventory.scoreOpenBreakdownAriaLabel', {
                defaultMessage: 'Open score breakdown for {name}',
                values: { name: app.name },
              })}
            >
              {score}
            </EuiBadge>
          }
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ScoreSparkline
          scores={app.scoreTrend}
          score={score}
          ariaLabel={i18n.translate('xpack.ux.inventory.scoreSparklineAriaLabel', {
            defaultMessage: 'Score over the selected range',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <DeltaText value={app.scoreDelta} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
