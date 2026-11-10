/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  euiPaletteForStatus,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiStat,
} from '@elastic/eui';
import type { EuiStatProps } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { VitalRating } from '../../../../../../../common/core_web_vitals';
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

interface Props {
  title: string;
  value?: string | null;
  rating?: VitalRating;
  ranks?: number[];
  loading: boolean;
  thresholds: Thresholds;
  isCls?: boolean;
  helpLabel: string;
  dataTestSubj?: string;
}

const RATING_COLORS: Record<VitalRating, EuiStatProps['titleColor']> = {
  good: 'success',
  needsImprovement: 'warning',
  poor: 'danger',
};

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
  rating,
  thresholds,
  ranks,
  isCls,
  helpLabel,
  dataTestSubj,
}: Props) {
  const palette = euiPaletteForStatus(3);
  const [inFocusInd, setInFocusInd] = useState<number | null>(null);
  // While refreshing, the previous rating and ranks are hidden so they never read as the new data.
  const visibleRating = loading ? undefined : rating;
  const visibleRanks = loading ? undefined : ranks;

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
        titleColor={visibleRating ? RATING_COLORS[visibleRating] : 'default'}
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup
        gutterSize="none"
        alignItems="flexStart"
        style={{ maxWidth: 350 }}
        responsive={false}
      >
        {visibleRanks ? (
          palette.map((hexCode, ind) => (
            <ColorPaletteFlexItem
              hexCode={hexCode}
              key={hexCode}
              position={ind}
              inFocus={inFocusInd !== ind && inFocusInd !== null}
              percentage={visibleRanks[ind]}
              tooltip={getCoreVitalTooltipMessage(thresholds, ind, title, visibleRanks[ind], isCls)}
            />
          ))
        ) : (
          <EuiFlexItem>
            <EuiSkeletonRectangle width="100%" height={16} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <PaletteLegends
        ranks={visibleRanks}
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
