/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { CuratedCategory } from '../types';
import { CuratedCategorySection } from './curated_category';
import { CuratedTileCard } from './curated_tile';

export interface CuratedGridProps {
  /**
   * Optional heading block. The o11y Variant B host renders its own persistent
   * heading outside this component (it must stay visible while search results
   * replace the grid), so it does not pass these. Other hosts can.
   */
  title?: string;
  subtitle?: string;
  categories: readonly CuratedCategory[];
  columns?: 1 | 2 | 3 | 4;
  /** Trailing section slot, used for the mini tiles row. */
  children?: React.ReactNode;
}

export const CuratedGrid = ({
  title,
  subtitle,
  categories,
  columns = 3,
  children,
}: CuratedGridProps) => (
  <>
    {title && (
      <>
        <EuiTitle size="s">
          <h3>{title}</h3>
        </EuiTitle>
        {subtitle && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>{subtitle}</p>
            </EuiText>
          </>
        )}
        <EuiSpacer size="l" />
      </>
    )}
    <EuiFlexGroup direction="column" gutterSize="xl">
      {categories.map((category) => (
        <EuiFlexItem key={category.id} grow={false}>
          <CuratedCategorySection id={category.id} label={category.label}>
            <EuiFlexGrid columns={columns} gutterSize="m">
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
  </>
);
