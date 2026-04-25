/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFilterGroup } from '@elastic/eui';
import type { FilterOptionsBase, StatusFilterBase } from '../../../../common/types';
import { statusFilterBaseOptions } from '../../../../common/components/filters';
import { StatusFilterButton } from '../../../../common/components';

export interface MigrationDashboardsFilterProps {
  filterOptions?: FilterOptionsBase;
  onFilterOptionsChanged: (filterOptions?: FilterOptionsBase) => void;
}

export const MigrationDashboardsFilter: React.FC<MigrationDashboardsFilterProps> = React.memo(
  ({ filterOptions, onFilterOptionsChanged }) => {
    const handleOnStatusChanged = useCallback(
      (newStatus?: StatusFilterBase) => {
        onFilterOptionsChanged({ ...filterOptions, ...{ status: newStatus } });
      },
      [filterOptions, onFilterOptionsChanged]
    );

    return (
      <EuiFilterGroup>
        <StatusFilterButton
          status={filterOptions?.status}
          onStatusChanged={handleOnStatusChanged}
          statusFilterOptions={statusFilterBaseOptions}
        />
      </EuiFilterGroup>
    );
  }
);
MigrationDashboardsFilter.displayName = 'MigrationDashboardsFilter';
