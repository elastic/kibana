/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SdlcEpicPhaseSummary } from '../../../../common/api/types';
import { getOwnerInitials } from '../../executive_page/lib/coverage_utils';
import { buildPhaseCells, getCurrentPhaseLabel } from '../lib/phase_cell_model';
import { PHASE_DEFINITIONS } from '../lib/phase_definitions';
import { PhaseGateCell } from './phase_gate_cell';
import { PIPELINE_GRID_TEMPLATE } from './pipeline_grid_header';

const BandSeparator = () => {
  const { euiTheme } = useEuiTheme();
  return <div css={css`background: ${euiTheme.border.color};`} />;
};

export const PipelineEpicRow = ({
  epic,
  expandedCells,
  onToggleCell,
}: {
  epic: SdlcEpicPhaseSummary;
  expandedCells: ReadonlySet<string>;
  onToggleCell: (cellKey: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const cells = useMemo(() => buildPhaseCells(epic), [epic]);
  const currentPhase = getCurrentPhaseLabel(cells);

  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: ${PIPELINE_GRID_TEMPLATE};
        width: 100%;
        border-bottom: ${euiTheme.border.thin};
      `}
    >
      <div
        css={css`
          padding: ${euiTheme.size.s} ${euiTheme.size.m};
          border-right: ${euiTheme.border.thin};
          position: sticky;
          left: 0;
          z-index: 1;
          background: ${euiTheme.colors.emptyShade};
          box-shadow: 2px 0 4px rgba(0, 0, 0, 0.04);
        `}
      >
        <EuiText size="xs" color="subdued">
          <code>{epic.displayId}</code>
        </EuiText>
        <EuiText size="s">
          <strong>{epic.title}</strong>
        </EuiText>
        {epic.owner ? (
          <EuiText size="xs" color="subdued">
            {getOwnerInitials(epic.owner)} {epic.owner}
          </EuiText>
        ) : null}
        <EuiBadge
          css={css`
            margin-top: ${euiTheme.size.xs};
          `}
        >
          <FormattedMessage
            id="xpack.sdlcIntel.pipeline.epic.currentPhase"
            defaultMessage="at {phase}"
            values={{ phase: currentPhase }}
          />
        </EuiBadge>
      </div>
      <BandSeparator />
      {cells.slice(0, 3).map((cell, index) => (
        <PhaseGateCell
          key={cell.key}
          definition={PHASE_DEFINITIONS[index]}
          cell={cell}
          expanded={expandedCells.has(`${epic.id}|${cell.key}`)}
          onToggleExpand={() => onToggleCell(`${epic.id}|${cell.key}`)}
        />
      ))}
      <BandSeparator />
      {cells.slice(3, 5).map((cell, index) => (
        <PhaseGateCell
          key={cell.key}
          definition={PHASE_DEFINITIONS[index + 3]}
          cell={cell}
          expanded={expandedCells.has(`${epic.id}|${cell.key}`)}
          onToggleExpand={() => onToggleCell(`${epic.id}|${cell.key}`)}
        />
      ))}
      <BandSeparator />
      {cells.slice(5, 8).map((cell, index) => (
        <PhaseGateCell
          key={cell.key}
          definition={PHASE_DEFINITIONS[index + 5]}
          cell={cell}
          expanded={expandedCells.has(`${epic.id}|${cell.key}`)}
          onToggleExpand={() => onToggleCell(`${epic.id}|${cell.key}`)}
        />
      ))}
    </div>
  );
};
