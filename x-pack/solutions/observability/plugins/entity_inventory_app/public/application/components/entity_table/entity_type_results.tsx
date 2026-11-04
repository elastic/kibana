/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import { EntityTypeNotFoundError, useEntityList } from '../../hooks/use_entity_list';
import { EntityTable } from './entity_table';
import {
  EntityTableDiagnosticsCallout,
  EntityTableTruncationCallout,
} from './entity_table_callouts';
import {
  EntityTableEmpty,
  EntityTableLoadError,
  EntityTableLoading,
  EntityTableTypeNotAvailable,
} from './entity_table_states';

/** The results of one entity type over the committed time range, with its loading states. */
export const EntityTypeResults = ({ entityType }: { entityType: string }) => {
  const { entityType: description, list, loading, error, refresh } = useEntityList(entityType);

  if (!description || !list) {
    if (error instanceof EntityTypeNotFoundError) {
      return <EntityTableTypeNotAvailable entityType={entityType} />;
    }
    if (error && !loading) {
      return (
        <EntityTableLoadError entityType={entityType} message={error.message} onRetry={refresh} />
      );
    }
    return <EntityTableLoading />;
  }

  const { rows, total, truncated, errors, unavailableColumns } = list;
  const isEmpty = rows.length === 0;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {loading && (
        <EuiFlexItem grow={false}>
          <EuiProgress size="xs" color="accent" />
        </EuiFlexItem>
      )}
      {(errors.length > 0 || unavailableColumns.length > 0) && (
        <EuiFlexItem grow={false}>
          <EntityTableDiagnosticsCallout errors={errors} unavailableColumns={unavailableColumns} />
        </EuiFlexItem>
      )}
      {/* With no rows the empty state says enough; "showing the 0 most recent" would not help. */}
      {truncated && !isEmpty && (
        <EuiFlexItem grow={false}>
          <EntityTableTruncationCallout returned={rows.length} total={total} />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        {isEmpty ? (
          <EntityTableEmpty typeName={description.name} />
        ) : (
          <EntityTable entityType={description} list={list} />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
