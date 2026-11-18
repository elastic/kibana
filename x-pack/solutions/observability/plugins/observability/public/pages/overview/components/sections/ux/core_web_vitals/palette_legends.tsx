/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  euiPaletteForStatus,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import { euiLightVars, euiDarkVars } from '@kbn/ui-theme';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import type { Thresholds } from './core_vital_item';
import { getCoreVitalTooltipMessage } from './core_vital_item';
import {
  LEGEND_NEEDS_IMPROVEMENT_LABEL,
  LEGEND_GOOD_LABEL,
  LEGEND_POOR_LABEL,
} from './translations';

const PaletteLegend = styled(EuiHealth)`
  &:hover {
    cursor: pointer;
    text-decoration: underline;
  }
`;

const StyledSpan = styled.span<{
  darkMode: boolean;
}>`
  &:hover {
    background-color: ${(props) =>
      props.darkMode ? euiDarkVars.euiColorLightestShade : euiLightVars.euiColorLightestShade};
  }
`;

const legendTextStyles = css`
  display: grid;

  > * {
    grid-area: 1 / 1;
  }
`;

// Non-breaking hyphens, so a narrow legend never splits the placeholder across lines.
const NO_SHARE = '\u2011\u2011';

const reservedSpaceStyles = css`
  visibility: hidden;
`;

function LegendText({ label, rank }: { label: string; rank: number | string }) {
  return (
    <FormattedMessage
      id="xpack.observability.ux.coreVitals.paletteLegend.rankPercentage"
      defaultMessage="{labelsInd} ({ranksInd}%)"
      values={{
        labelsInd: label,
        ranksInd: rank,
      }}
    />
  );
}

interface Props {
  onItemHover: (ind: number | null) => void;
  ranks?: number[];
  thresholds: Thresholds;
  title: string;
  isCls?: boolean;
}

export function PaletteLegends({ ranks, title, onItemHover, thresholds, isCls }: Props) {
  const darkMode = useKibanaIsDarkMode();
  const palette = euiPaletteForStatus(3);
  const labels = [LEGEND_GOOD_LABEL, LEGEND_NEEDS_IMPROVEMENT_LABEL, LEGEND_POOR_LABEL];

  return (
    <EuiFlexGroup responsive={false} gutterSize="s">
      {palette.map((color, ind) => (
        <EuiFlexItem
          key={ind}
          grow={false}
          onMouseEnter={() => {
            onItemHover(ind);
          }}
          onMouseLeave={() => {
            onItemHover(null);
          }}
        >
          <EuiToolTip
            content={ranks && getCoreVitalTooltipMessage(thresholds, ind, title, ranks[ind], isCls)}
            position="bottom"
          >
            <StyledSpan darkMode={darkMode} tabIndex={ranks ? 0 : undefined}>
              <PaletteLegend color={ranks ? color : 'subdued'}>
                <EuiText
                  size="xs"
                  data-test-subj={ranks && `${labels[ind]}-${ranks[ind]}`}
                  css={legendTextStyles}
                >
                  {/* Sized by the widest share, so loading and loaded legends wrap alike. */}
                  <span aria-hidden={true} css={reservedSpaceStyles}>
                    <LegendText label={labels[ind]} rank={100} />
                  </span>
                  <span>
                    <LegendText label={labels[ind]} rank={ranks?.[ind] ?? NO_SHARE} />
                  </span>
                </EuiText>
              </PaletteLegend>
            </StyledSpan>
          </EuiToolTip>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
