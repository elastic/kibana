/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFacetButton,
  EuiBetaBadge,
  EuiPanel,
  EuiFlexGroup,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { coverageOverviewLegendWidth } from '../constants';
import * as i18n from '../translations';
import { useCoverageColors } from '../use_coverage_colors';

const LegendLabel = ({ label, color }: { label: string; color?: string }) => (
  <EuiFacetButton
    size="xs"
    element="span"
    css={{ padding: 0 }}
    icon={
      <EuiBetaBadge
        css={{ background: color, boxShadow: color != null ? 'none' : undefined }}
        label={label}
        iconType="empty"
        size="s"
      />
    }
  >
    {label}
  </EuiFacetButton>
);

export const CoverageOverviewLegend = () => {
  const { coverageColors } = useCoverageColors();

  const thresholds = useMemo(
    () =>
      coverageColors.map(({ threshold, backgroundColor }, index, thresholdsMap) => (
        <LegendLabel
          key={index}
          label={`${
            index === 0
              ? `\u003E${threshold}`
              : `${threshold}-${thresholdsMap[index - 1].threshold}`
          } ${i18n.CoverageOverviewLegendRulesLabel}`}
          color={backgroundColor}
        />
      )),
    [coverageColors]
  );

  return (
    <EuiPanel css={{ maxWidth: `${coverageOverviewLegendWidth}px` }} hasBorder>
      <EuiFlexGroup gutterSize="xs">
        <EuiText size="s">
          <h4>{i18n.CoverageOverviewLegendTitle}</h4>
        </EuiText>
        <EuiText size="s">
          <small>{i18n.CoverageOverviewLegendSubtitle}</small>
        </EuiText>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xs" wrap>
        {thresholds}

        <LegendLabel label={`0 ${i18n.CoverageOverviewLegendRulesLabel}`} />
      </EuiFlexGroup>
    </EuiPanel>
  );
};
