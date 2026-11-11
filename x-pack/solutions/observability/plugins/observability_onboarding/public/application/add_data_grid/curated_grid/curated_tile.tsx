/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiCard, EuiTextColor } from '@elastic/eui';
import type { CuratedTile } from '../types';

export interface CuratedTileCardProps {
  tile: CuratedTile;
}

const TITLE_LINES = 1;
const DESCRIPTION_LINES = 2;

// Reserving the block as well as clamping it keeps short copy from shrinking a
// tile, so every tile is the same height whether it comes from the curated
// grid or from a search result.
const reservedLinesStyle = (lines: number) => css`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${lines};
  overflow: hidden;
  block-size: calc(${lines} * 1lh);
`;

// EuiCard's own paddingSize scale tops out at 16px below the design's 24px
// step, and its title-description gap is a fixed 8px. `display: contents`
// keeps this wrapper out of the flex/grid box tree so overriding both here
// doesn't disturb sibling tile alignment in the grid.
const tileOverrideStyle = css`
  display: contents;

  .euiCard {
    padding: 12px;
    /* Positioning context for the optional badge below, passed through
     * EuiCard's own children slot so it stays a real DOM descendant. */
    position: relative;
  }

  .euiCard__title {
    ${reservedLinesStyle(TITLE_LINES)}
  }

  /* EUI doesn't expose a standalone .euiCard__description class, its name is
   * only a label suffix baked into the generated hash class. */
  [class*='euiCard__description'] {
    margin-top: 2px;
  }
`;

const badgeSlotStyle = css`
  position: absolute;
  top: 8px;
  right: 8px;
`;

export const CuratedTileCard = ({ tile }: CuratedTileCardProps) => (
  <div css={tileOverrideStyle}>
    <EuiCard
      layout="horizontal"
      titleSize="xs"
      hasBorder
      paddingSize="none"
      icon={tile.icon}
      title={tile.title}
      description={
        <EuiTextColor color="subdued" css={reservedLinesStyle(DESCRIPTION_LINES)}>
          {tile.description}
        </EuiTextColor>
      }
      data-test-subj={tile['data-test-subj']}
      href={tile.href}
      target={tile.target}
      onClick={tile.onClick}
    >
      {tile.badge && <div css={badgeSlotStyle}>{tile.badge}</div>}
    </EuiCard>
  </div>
);
