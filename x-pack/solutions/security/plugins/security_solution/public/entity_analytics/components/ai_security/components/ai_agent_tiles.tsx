/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { SignalCard } from '../../home/needs_attention_tiles/signal_card';
import type { SignalCardData } from '../../home/needs_attention_tiles/data';
import type { AgentInventoryRow } from '../types';
import {
  AI_AGENT_TILE_IDS,
  matchesTile,
  type AiAgentTileId,
  type TileContext,
} from './agent_filters';
import {
  TILE_HIGH_IMPACT_HOSTS_DESCRIPTION,
  TILE_HIGH_IMPACT_HOSTS_TITLE,
  TILE_NEW_INSTALLS_DESCRIPTION,
  TILE_NEW_INSTALLS_TITLE,
  TILE_PERSON_WATCHLISTS_DESCRIPTION,
  TILE_PERSON_WATCHLISTS_TITLE,
  TILE_RUNS_UNATTENDED_DESCRIPTION,
  TILE_RUNS_UNATTENDED_TITLE,
  TILE_UNSANCTIONED_DESCRIPTION,
  TILE_UNSANCTIONED_TITLE,
} from '../translations';

export const AI_AGENT_TILES_TEST_ID = 'aiAgentTiles';

const TILE_TEXT: Readonly<Record<AiAgentTileId, { title: string; description: string }>> = {
  unsanctioned: { title: TILE_UNSANCTIONED_TITLE, description: TILE_UNSANCTIONED_DESCRIPTION },
  personWatchlists: {
    title: TILE_PERSON_WATCHLISTS_TITLE,
    description: TILE_PERSON_WATCHLISTS_DESCRIPTION,
  },
  highImpactHosts: {
    title: TILE_HIGH_IMPACT_HOSTS_TITLE,
    description: TILE_HIGH_IMPACT_HOSTS_DESCRIPTION,
  },
  newInstalls: { title: TILE_NEW_INSTALLS_TITLE, description: TILE_NEW_INSTALLS_DESCRIPTION },
  runsUnattended: {
    title: TILE_RUNS_UNATTENDED_TITLE,
    description: TILE_RUNS_UNATTENDED_DESCRIPTION,
  },
};

export interface AiAgentTilesProps {
  readonly rows: readonly AgentInventoryRow[];
  readonly isLoading: boolean;
  readonly context: TileContext;
  readonly activeTile: AiAgentTileId | null;
  readonly onToggleTile: (tileId: AiAgentTileId) => void;
}

/** The analyst's jobs as signal cards: each counts installs and toggles the table filter. */
export const AiAgentTiles = ({
  rows,
  isLoading,
  context,
  activeTile,
  onToggleTile,
}: AiAgentTilesProps) => {
  const { euiTheme } = useEuiTheme();
  const cards = useMemo(
    () =>
      AI_AGENT_TILE_IDS.map(
        (tileId): { tileId: AiAgentTileId; card: SignalCardData<AiAgentTileId> } => {
          const { title, description } = TILE_TEXT[tileId];
          return {
            tileId,
            card: {
              id: tileId,
              title,
              description,
              filterLabel: title,
              value: rows.filter((row) => matchesTile(tileId, row, context)).length,
              hasCount: !isLoading,
              isLoading,
            },
          };
        }
      ),
    [rows, isLoading, context]
  );

  return (
    <div
      data-test-subj={AI_AGENT_TILES_TEST_ID}
      css={css`
        display: grid;
        gap: ${euiTheme.size.s};
        grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
      `}
    >
      {cards.map(({ tileId, card }) => (
        <div key={tileId} css={{ minInlineSize: 0 }}>
          <SignalCard
            card={card}
            selected={activeTile === tileId}
            timeRange="7d"
            onToggle={() => onToggleTile(tileId)}
          />
        </div>
      ))}
    </div>
  );
};
