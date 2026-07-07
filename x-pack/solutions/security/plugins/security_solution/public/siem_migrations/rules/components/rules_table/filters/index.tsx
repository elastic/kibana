/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFilterGroup } from '@elastic/eui';
import { statusFilterBaseOptions } from '../../../../common/components/filters';
import { StatusFilterButton } from '../../../../common/components';
import {
  RulesSpecificStatusFilter,
  type AuthorFilter,
  type RulesFilterOptions,
  type RulesStatusFilter,
} from '../../../types';
import { AuthorFilterButton } from './author';
import * as i18n from './translations';

export interface MigrationRulesFilterProps {
  filterOptions?: RulesFilterOptions;
  onFilterOptionsChanged: (filterOptions?: RulesFilterOptions) => void;
}

export const MigrationRulesFilter: React.FC<MigrationRulesFilterProps> = React.memo(
  ({ filterOptions, onFilterOptionsChanged }) => {
    const handleOnStatusChanged = useCallback(
      (newStatus?: RulesStatusFilter) => {
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

    const statusFilterOptions = [
      ...statusFilterBaseOptions,
      {
        label: i18n.INDEX_PATTERN_MISSING_FILTER_OPTION,
        data: { status: RulesSpecificStatusFilter.INDEX_PATTERN_MISSING },
      },
    ];

    return (
      <EuiFilterGroup>
        <StatusFilterButton
          status={filterOptions?.status}
          onStatusChanged={handleOnStatusChanged}
          statusFilterOptions={statusFilterOptions}
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
