/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFilterGroup } from '@elastic/eui';
import type { AuthorFilter, FilterOptions, StatusFilter } from '../../../types';
import { StatusFilterButton } from './status';
import { AuthorFilterButton } from './author';

export interface MigrationRulesFilterProps {
  filterOptions?: FilterOptions;
  onFilterOptionsChanged: (filterOptions?: FilterOptions) => void;
}

export const MigrationRulesFilter: React.FC<MigrationRulesFilterProps> = React.memo(
  ({ filterOptions, onFilterOptionsChanged }) => {
    const handleOnStatusChanged = useCallback(
      (newStatus?: StatusFilter) => {
        onFilterOptionsChanged({ ...filterOptions, ...{ status: newStatus } });
      },
      [filterOptions, onFilterOptionsChanged]
    );

    const handleOnAuthorChanged = useCallback(
      (newAuthor?: AuthorFilter) => {
        onFilterOptionsChanged({ ...filterOptions, ...{ author: newAuthor } });
      },
      [filterOptions, onFilterOptionsChanged]
    );

    return (
      <EuiFilterGroup>
        <StatusFilterButton
          status={filterOptions?.status}
          onStatusChanged={handleOnStatusChanged}
        />
        <AuthorFilterButton
          author={filterOptions?.author}
          onAuthorChanged={handleOnAuthorChanged}
        />
      </EuiFilterGroup>
    );
  }
);
MigrationRulesFilter.displayName = 'MigrationRulesFilter';
