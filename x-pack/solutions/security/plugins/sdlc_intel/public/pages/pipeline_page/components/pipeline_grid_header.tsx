/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { BAND_COLORS, PHASE_DEFINITIONS } from '../lib/phase_definitions';

/** Epic column + band separators + P1–P8 phase columns that grow to fill the roadmap block width. */
export const PIPELINE_GRID_TEMPLATE =
  'minmax(160px, 1.15fr) 2px repeat(3, minmax(72px, 1fr)) 2px repeat(2, minmax(80px, 1fr)) 2px repeat(3, minmax(72px, 1fr))';

const BandSeparator = () => {
  const { euiTheme } = useEuiTheme();
  return <div css={css`background: ${euiTheme.border.color};`} />;
};

export const PipelineGridHeader = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: ${PIPELINE_GRID_TEMPLATE};
        width: 100%;
        position: sticky;
        top: 0;
        z-index: 2;
        background: ${euiTheme.colors.lightestShade};
        border-top: ${euiTheme.border.thin};
        border-bottom: ${euiTheme.border.thin};
      `}
    >
      <div
        css={css`
          padding: ${euiTheme.size.s};
          position: sticky;
          left: 0;
          z-index: 3;
          background: ${euiTheme.colors.lightestShade};
          border-right: ${euiTheme.border.thin};
        `}
      >
        <EuiText size="xs" color="subdued">
          <FormattedMessage id="xpack.sdlcIntel.pipeline.grid.epic" defaultMessage="Epic" />
        </EuiText>
      </div>
      <BandSeparator />
      {PHASE_DEFINITIONS.slice(0, 3).map((definition) => (
        <PhaseHeaderCell key={definition.key} definition={definition} />
      ))}
      <BandSeparator />
      {PHASE_DEFINITIONS.slice(3, 5).map((definition) => (
        <PhaseHeaderCell key={definition.key} definition={definition} />
      ))}
      <BandSeparator />
      {PHASE_DEFINITIONS.slice(5, 8).map((definition) => (
        <PhaseHeaderCell key={definition.key} definition={definition} />
      ))}
    </div>
  );
};

const PhaseHeaderCell = ({
  definition,
}: {
  definition: (typeof PHASE_DEFINITIONS)[number];
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        padding: ${euiTheme.size.xs} ${euiTheme.size.s};
        border-right: ${euiTheme.border.thin};
        border-top: 3px solid ${BAND_COLORS[definition.band].border};
        background: ${BAND_COLORS[definition.band].headerBackground};
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;
      `}
    >
      <EuiText size="xs">
        <strong>{definition.label}</strong>
      </EuiText>
      <EuiIcon type={definition.icon} size="s" />
      <EuiText size="xs" textAlign="center">
        <strong>{definition.title}</strong>
      </EuiText>
      <EuiText size="xs" color="subdued" textAlign="center">
        {definition.subtitle}
      </EuiText>
    </div>
  );
};
