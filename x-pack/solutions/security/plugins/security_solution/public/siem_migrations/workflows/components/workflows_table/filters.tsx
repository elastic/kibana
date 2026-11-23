/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFilterGroup } from '@elastic/eui';
import type { FilterOptionsBase, StatusFilterBase } from '../../../common/types';
import { StatusFilterBase as StatusFilter } from '../../../common/types';
import { statusFilterBaseOptions } from '../../../common/components/filters';
import { StatusFilterButton } from '../../../common/components';

// Installing workflows is not available yet, so the "installed" status is not offered
const statusFilterOptions = statusFilterBaseOptions.filter(
  ({ data }) => data.status !== StatusFilter.INSTALLED
);

export interface MigrationWorkflowsFilterProps {
  filterOptions?: FilterOptionsBase;
  onFilterOptionsChanged: (filterOptions?: FilterOptionsBase) => void;
}

export const MigrationWorkflowsFilter: React.FC<MigrationWorkflowsFilterProps> = React.memo(
  ({ filterOptions, onFilterOptionsChanged }) => {
    const handleOnStatusChanged = useCallback(
      (newStatus?: StatusFilterBase) => {
        onFilterOptionsChanged({ ...filterOptions, status: newStatus });
      },
      [filterOptions, onFilterOptionsChanged]
    );

    return (
      <EuiFilterGroup>
        <StatusFilterButton
          status={filterOptions?.status}
          onStatusChanged={handleOnStatusChanged}
          statusFilterOptions={statusFilterOptions}
        />
      </EuiFilterGroup>
    );
  }
);
MigrationWorkflowsFilter.displayName = 'MigrationWorkflowsFilter';
