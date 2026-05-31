/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiPanel,
  EuiProgress,
  EuiText,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SdlcTeamCard, SdlcTeamsResponse } from '../../../../common/api/types';
import { getRoadmapAccentColor } from '../lib/team_accents';
import type { MiniPhaseGate } from '../lib/team_epic_utils';
import {
  TEAMS_MATRIX_ROADMAP_COLUMN_WIDTH,
  getTeamsMatrixTeamColumnWidth,
} from '../lib/teams_matrix_layout';

interface MatrixRow {
  readonly roadmapId: string;
  readonly roadmapLabel: string;
  readonly cells: Readonly<Record<string, { pct: number; phaseGates: readonly MiniPhaseGate[] }>>;
}

const miniGateColor = (gate: MiniPhaseGate, euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']) => {
  if (gate === 'p') {
    return euiTheme.colors.backgroundLightSuccess;
  }
  if (gate === 'w') {
    return euiTheme.colors.backgroundLightWarning;
  }
  if (gate === 'f') {
    return euiTheme.colors.backgroundLightDanger;
  }
  return euiTheme.colors.lightestShade;
};

const buildMatrixRows = (
  matrix: SdlcTeamsResponse['matrix'],
  teams: readonly SdlcTeamCard[]
): MatrixRow[] =>
  matrix.roadmaps.map((roadmap) => {
    const cells: Record<string, { pct: number; phaseGates: MiniPhaseGate[] }> = {};

    for (const team of teams) {
      const row = matrix.rows.find((entry) => entry.teamKey === team.key);
      const cell = row?.cells[roadmap.id];
      cells[team.key] = {
        pct: cell?.pct ?? 0,
        phaseGates: (cell?.phaseGates ?? []) as MiniPhaseGate[],
      };
    }

    return {
      roadmapId: roadmap.id,
      roadmapLabel: roadmap.label,
      cells,
    };
  });

export const ContributionMatrix = ({
  matrix,
  teams,
}: {
  matrix: SdlcTeamsResponse['matrix'];
  teams: readonly SdlcTeamCard[];
}) => {
  const { euiTheme } = useEuiTheme();
  const rows = buildMatrixRows(matrix, teams);

  const columns: Array<EuiBasicTableColumn<MatrixRow>> = [
    {
      field: 'roadmapLabel',
      name: (
        <FormattedMessage id="xpack.sdlcIntel.teams.matrix.roadmap" defaultMessage="Roadmap" />
      ),
      width: TEAMS_MATRIX_ROADMAP_COLUMN_WIDTH,
      render: (_, item) => (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <span
            css={css`
              width: 8px;
              height: 8px;
              border-radius: 2px;
              background: ${getRoadmapAccentColor(item.roadmapId)};
              display: inline-block;
            `}
          />
          <EuiText size="s">{item.roadmapLabel}</EuiText>
        </EuiFlexGroup>
      ),
    },
    ...teams.map((team) => ({
      name: team.name,
      align: 'center' as const,
      width: getTeamsMatrixTeamColumnWidth(teams.length),
      render: (item: MatrixRow) => {
        const cell = item.cells[team.key];
        if (!cell || cell.pct === 0) {
          return (
            <EuiText size="xs" color="subdued">
              —
            </EuiText>
          );
        }

        return (
          <div
            css={css`
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 2px;
            `}
          >
            <EuiText size="xs" color="subdued">
              {cell.pct}%
            </EuiText>
            <div css={css`width: 36px;`}>
              <EuiProgress value={cell.pct} max={100} size="s" color="primary" />
            </div>
            <div
              css={css`
                display: flex;
                gap: 1px;
              `}
            >
              {cell.phaseGates.slice(0, 6).map((gate, index) => (
                <span
                  key={`${team.key}-${item.roadmapId}-${index}`}
                  css={css`
                    width: 5px;
                    height: 5px;
                    border-radius: 1px;
                    background: ${miniGateColor(gate, euiTheme)};
                  `}
                />
              ))}
            </div>
          </div>
        );
      },
    })),
  ];

  return (
    <EuiPanel hasBorder paddingSize="none">
      <div
        css={css`
          padding: ${euiTheme.size.s} ${euiTheme.size.m};
          background: ${euiTheme.colors.lightestShade};
          border-bottom: ${euiTheme.border.thin};
        `}
      >
        <EuiText size="s">
          <strong>
            <FormattedMessage
              id="xpack.sdlcIntel.teams.matrix.title"
              defaultMessage="Roadmap × team contribution matrix"
            />
          </strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.sdlcIntel.teams.matrix.subtitle"
            defaultMessage="Each cell shows coverage share and phase gate mini-bar for that roadmap item."
          />
        </EuiText>
      </div>
      <EuiBasicTable<MatrixRow> items={rows} columns={columns} tableLayout="fixed" />
    </EuiPanel>
  );
};
