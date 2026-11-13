/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import type { InventoryType } from '@kbn/entity-inventory-plugin/common';
import { useEntityTablePreferences } from '../../context/entity_table_preferences_context';
import type { EntityListResult } from '../../hooks/use_entity_list';
import { TableSkeleton } from '../table_skeleton/table_skeleton';
import { EntityDataGrid } from './entity_data_grid';
import { EntityTableEmpty, EntityTableLoadError } from '../entity_states/entity_states';
import { LOADING_ENTITIES_LABEL } from '../entity_states/translations';

export interface EntityTableProps {
  entityType: InventoryType;
  listResult: EntityListResult;
}

export const EntityTable = ({ entityType, listResult }: EntityTableProps) => {
  const { type, name } = entityType;
  const { data: list, loading, error, refresh } = listResult;
  const { preferences, onPreferencesChange } = useEntityTablePreferences(type);

  if (error && !loading) {
    return <EntityTableLoadError ebtDetail={type} message={error.message} onRetry={refresh} />;
  }

  const { rows, errors } = list;
  const isEmpty = rows.length === 0;

  if (loading && isEmpty) {
    return (
      <TableSkeleton
        contentAriaLabel={LOADING_ENTITIES_LABEL}
        dataTestSubj="entityInventoryTableSkeleton"
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {loading && (
        <EuiFlexItem grow={false}>
          <EuiProgress size="xs" color="accent" data-test-subj="entityInventoryTableReloading" />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        {isEmpty ? (
          <EntityTableEmpty typeName={name} isIncomplete={errors.length > 0} />
        ) : (
          <EntityDataGrid
            entityType={entityType}
            list={list}
            preferences={preferences}
            onPreferencesChange={onPreferencesChange}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
