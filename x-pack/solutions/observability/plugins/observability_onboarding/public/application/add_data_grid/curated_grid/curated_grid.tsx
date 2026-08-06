/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { CuratedCategory } from '../types';
import { CuratedCategorySection } from './curated_category';
import { CuratedTileCard } from './curated_tile';

// Provisional pending final designs. The host renders its own heading above
// this component, so the grid is only ever the categories and the slot.
const COLUMNS = 3;

export interface CuratedGridProps {
  categories: readonly CuratedCategory[];
  /** Trailing section slot, used for the mini tiles row. */
  children?: React.ReactNode;
}

export const CuratedGrid = ({ categories, children }: CuratedGridProps) => (
  <EuiFlexGroup direction="column" gutterSize="xl">
    {categories.map((category) => (
      <EuiFlexItem key={category.id} grow={false}>
        <CuratedCategorySection id={category.id} label={category.label}>
          <EuiFlexGrid columns={COLUMNS} gutterSize="m">
            {category.tiles.map((tile) => (
              <EuiFlexItem key={tile.id}>
                <CuratedTileCard tile={tile} />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </CuratedCategorySection>
      </EuiFlexItem>
    ))}
    {children && <EuiFlexItem grow={false}>{children}</EuiFlexItem>}
  </EuiFlexGroup>
);
