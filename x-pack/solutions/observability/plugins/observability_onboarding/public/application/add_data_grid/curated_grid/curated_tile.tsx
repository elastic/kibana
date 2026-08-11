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
  /** Clamp the description to N lines. Unset renders the full text. */
  descriptionLineCount?: number;
}

const clampStyle = (lines: number) => css`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${lines};
  overflow: hidden;
`;

export const CuratedTileCard = ({ tile, descriptionLineCount }: CuratedTileCardProps) => (
  <EuiCard
    layout="horizontal"
    titleSize="xs"
    hasBorder
    paddingSize="m"
    icon={tile.icon}
    title={tile.title}
    description={
      <EuiTextColor
        color="subdued"
        css={descriptionLineCount ? clampStyle(descriptionLineCount) : undefined}
      >
        {tile.description}
      </EuiTextColor>
    }
    data-test-subj={tile['data-test-subj']}
    href={tile.href}
    target={tile.target}
    onClick={tile.onClick}
  />
);
