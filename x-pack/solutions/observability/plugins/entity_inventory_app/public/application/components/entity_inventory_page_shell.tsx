/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { EntityInventoryEntityCategory } from '../../types';
import { EntityInventorySearchProvider } from '../context/entity_inventory_search_context';
import { EntityInventorySearchBar } from './entity_inventory_search_bar';

export interface EntityInventoryPageShellProps {
  entityCategory: EntityInventoryEntityCategory;
  /** Category-specific controls rendered below the search bar. */
  secondaryControls?: React.ReactNode;
  /** Page content; it reads `{ entityCategory, query, filters, dateRange }` via `useEntityInventorySearch()`. */
  children?: React.ReactNode;
}

/** Shared layout for every entity inventory page: search bar, optional controls and content. */
export const EntityInventoryPageShell = ({
  entityCategory,
  secondaryControls,
  children,
}: EntityInventoryPageShellProps) => {
  return (
    <EntityInventorySearchProvider entityCategory={entityCategory}>
      <EuiFlexGroup
        direction="column"
        gutterSize="m"
        data-test-subj="entityInventoryPageShell"
        data-entity-category={entityCategory}
        css={css`
          /* Lets the content slot scroll instead of growing the page. */
          min-height: 0;
        `}
      >
        <EuiFlexItem grow={false}>
          <EntityInventorySearchBar />
        </EuiFlexItem>
        {secondaryControls && (
          <EuiFlexItem grow={false} data-test-subj="entityInventorySecondaryControls">
            {secondaryControls}
          </EuiFlexItem>
        )}
        <EuiFlexItem
          data-test-subj="entityInventoryPageContent"
          css={css`
            min-height: 0;
          `}
        >
          {children}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EntityInventorySearchProvider>
  );
};
