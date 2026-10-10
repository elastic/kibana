/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCard,
  EuiFlexGroup,
  EuiIconTip,
  euiPaletteForStatus,
  EuiSpacer,
  EuiStat,
  useEuiTheme,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { PaletteLegends } from './palette_legends';
import { ColorPaletteFlexItem } from './color_palette_flex_item';

import {
  CV_AVERAGE_LABEL,
  CV_GOOD_LABEL,
  LESS_LABEL,
  MORE_LABEL,
  NO_DATA,
  CV_POOR_LABEL,
  IS_LABEL,
  TAKES_LABEL,
} from './translations';

export interface Thresholds {
  good: string;
  bad: string;
}

/**
 * Parses a Core Web Vitals value or threshold (e.g. "2.5 s", "450 ms", "0.1")
 * into a comparable number normalised to a single unit (milliseconds for timings,
 * the raw value for unitless metrics such as CLS). Returns `null` when the input
 * cannot be parsed so callers can fall back safely.
 */
export function parseCoreVitalValue(input?: string | null): number | null {
  if (input === undefined || input === null) {
    return null;
  }
  const match = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*(ms|s)?$/i);
  if (!match) {
    return null;
  }
  const magnitude = Number(match[1]);
  if (Number.isNaN(magnitude)) {
    return null;
  }
  const unit = match[2]?.toLowerCase();
  return unit === 's' ? magnitude * 1000 : magnitude;
}

/**
 * Returns the status index (0 = good, 1 = needs improvement, 2 = poor) for the
 * displayed value by comparing it against the metric thresholds, or `null` when
 * the value or thresholds cannot be parsed.
 */
export function getValueStatusIndex(
  value: string | null | undefined,
  thresholds: Thresholds
): number | null {
  const numericValue = parseCoreVitalValue(value);
  const goodThreshold = parseCoreVitalValue(thresholds.good);
  const badThreshold = parseCoreVitalValue(thresholds.bad);
  if (numericValue === null || goodThreshold === null || badThreshold === null) {
    return null;
  }
  if (numericValue <= goodThreshold) {
    return 0;
  }
  if (numericValue >= badThreshold) {
    return 2;
  }
  return 1;
}

interface Props {
  title: string;
  value?: string | null;
  ranks?: number[];
  loading: boolean;
  thresholds: Thresholds;
  isCls?: boolean;
  helpLabel: string;
  dataTestSubj?: string;
}

export function getCoreVitalTooltipMessage(
  thresholds: Thresholds,
  position: number,
  title: string,
  percentage: number,
  isCls?: boolean
) {
  const good = position === 0;
  const bad = position === 2;
  const average = !good && !bad;

  return i18n.translate('xpack.observability.ux.dashboard.webVitals.palette.tooltip', {
    defaultMessage:
      '{percentage} % of users have {exp} experience because the {title} {isOrTakes} {moreOrLess} than {value}{averageMessage}.',
    values: {
      percentage,
      isOrTakes: isCls ? IS_LABEL : TAKES_LABEL,
      title: title?.toLowerCase(),
      exp: good ? CV_GOOD_LABEL : bad ? CV_POOR_LABEL : CV_AVERAGE_LABEL,
      moreOrLess: bad || average ? MORE_LABEL : LESS_LABEL,
      value: good || average ? thresholds.good : thresholds.bad,
      averageMessage: average
        ? i18n.translate('xpack.observability.ux.coreVitals.averageMessage', {
            defaultMessage: ' and less than {bad}',
            values: { bad: thresholds.bad },
          })
        : '',
    },
  });
}

export function CoreVitalItem({
  loading,
  title,
  value,
  thresholds,
  ranks = [100, 0, 0],
  isCls,
  helpLabel,
  dataTestSubj,
}: Props) {
  const palette = euiPaletteForStatus(3);
  const [inFocusInd, setInFocusInd] = useState<number | null>(null);
  const biggestValIndex = ranks.indexOf(Math.max(...ranks));
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  const colorsStatus = [colors.textSuccess, colors.textWarning, colors.textDanger];
  // Colour the stat by the status of the value actually displayed (good/needs
  // improvement/poor) so it matches the number shown. Fall back to the
  // user-distribution bucket only when the value cannot be classified.
  const valueStatusIndex = getValueStatusIndex(value, thresholds);
  const titleColorIndex = valueStatusIndex ?? biggestValIndex;
  if (!value && !loading) {
    return <EuiCard title={title} isDisabled={true} description={NO_DATA} />;
  }

  return (
    <>
      <EuiStat
        data-test-subj={dataTestSubj}
        aria-label={`${title} ${value}`} // aria-label is required when passing a component, instead of a string, as the description
        titleSize="s"
        title={value ?? ''}
        description={
          <>
            {title}
            <EuiIconTip content={helpLabel} type="question" />
          </>
        }
        isLoading={loading}
        titleColor={colorsStatus[titleColorIndex]}
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup
        gutterSize="none"
        alignItems="flexStart"
        style={{ maxWidth: 350 }}
        responsive={false}
      >
        {palette.map((hexCode, ind) => (
          <ColorPaletteFlexItem
            hexCode={hexCode}
            key={hexCode}
            position={ind}
            inFocus={inFocusInd !== ind && inFocusInd !== null}
            percentage={ranks[ind]}
            tooltip={getCoreVitalTooltipMessage(thresholds, ind, title, ranks[ind], isCls)}
          />
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <PaletteLegends
        ranks={ranks}
        thresholds={thresholds}
        title={title}
        onItemHover={(ind) => {
          setInFocusInd(ind);
        }}
        isCls={isCls}
      />
    </>
  );
}
