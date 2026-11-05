/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { EntityInventoryEntityCategory } from '../../types';
import { EntityInventorySearchProvider } from '../context/search_context';
import { EntityInventorySearchBar } from './search_bar';

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
      >
        <EuiFlexItem grow={false}>
          <EntityInventorySearchBar />
        </EuiFlexItem>
        {secondaryControls && (
          <EuiFlexItem grow={false} data-test-subj="entityInventorySecondaryControls">
            {secondaryControls}
          </EuiFlexItem>
        )}
        <EuiFlexItem data-test-subj="entityInventoryPageContent">{children}</EuiFlexItem>
      </EuiFlexGroup>
    </EntityInventorySearchProvider>
  );
};
