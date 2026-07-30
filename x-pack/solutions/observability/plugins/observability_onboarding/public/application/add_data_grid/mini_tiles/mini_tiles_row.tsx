/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useIsWithinBreakpoints } from '@elastic/eui';
import { CuratedCategorySection } from '../curated_grid/curated_category';
import type { MiniTile } from '../types';
import { MiniTileCard } from './mini_tile_card';

export interface MiniTilesRowProps {
  label: string;
  tiles: readonly MiniTile[];
  /** Host-built trailing tile (the o11y host passes its Browse all tile). */
  browseAllTile?: React.ReactNode;
}

export const MiniTilesRow = ({ label, tiles, browseAllTile }: MiniTilesRowProps) => {
  const shouldStackVertically = useIsWithinBreakpoints(['xs', 's', 'm']);

  return (
    <CuratedCategorySection id="more-integrations" label={label}>
      <EuiFlexGroup direction={shouldStackVertically ? 'column' : 'row'} gutterSize="m">
        <EuiFlexItem grow={shouldStackVertically ? false : 5}>
          <EuiFlexGroup gutterSize="m">
            {tiles.map((tile) => (
              <EuiFlexItem key={tile.id} grow={1}>
                <MiniTileCard tile={tile} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
        {browseAllTile && (
          <EuiFlexItem grow={shouldStackVertically ? false : 2}>{browseAllTile}</EuiFlexItem>
        )}
      </EuiFlexGroup>
    </CuratedCategorySection>
  );
};
