/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import { EntityTypeNotFoundError, useEntityList } from '../../hooks/use_entity_list';
import { EntityTable } from './entity_table';
import type { EntityTablePreferences } from './use_entity_table_state';
import { NO_PREFERENCES } from './use_entity_table_state';
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

/**
 * The results of one entity type over the committed time range, with its loading states. Keyed by
 * type so that a type switch starts with no rows. The column, sort and page size choices are kept
 * here, per type, so an empty range, a failed load or a switch to another type and back does not
 * discard them. They last as long as this component, and are not persisted (#6330).
 */
export const EntityTypeResults = ({ entityType }: { entityType: string }) => {
  const [preferencesByType, setPreferencesByType] = useState<
    Readonly<Record<string, EntityTablePreferences>>
  >({});
  const onPreferencesChange = useCallback(
    (preferences: EntityTablePreferences) =>
      setPreferencesByType((previous) => ({ ...previous, [entityType]: preferences })),
    [entityType]
  );

  return (
    <EntityTypeResultsOfType
      key={entityType}
      entityType={entityType}
      preferences={preferencesByType[entityType] ?? NO_PREFERENCES}
      onPreferencesChange={onPreferencesChange}
    />
  );
};

interface EntityTypeResultsOfTypeProps {
  entityType: string;
  preferences: EntityTablePreferences;
  onPreferencesChange: (preferences: EntityTablePreferences) => void;
}

const EntityTypeResultsOfType = ({
  entityType,
  preferences,
  onPreferencesChange,
}: EntityTypeResultsOfTypeProps) => {
  const { entityType: description, list, loading, error, refresh } = useEntityList(entityType);

  if (error instanceof EntityTypeNotFoundError) {
    return <EntityTableTypeNotAvailable entityType={entityType} />;
  }
  // A failed reload replaces the results of the last range rather than leaving them up as current.
  if (error && !loading) {
    return (
      <EntityTableLoadError entityType={entityType} message={error.message} onRetry={refresh} />
    );
  }
  if (!description || !list) {
    return <EntityTableLoading />;
  }

  const { rows, total, truncated, errors, unavailableColumns } = list;
  const isEmpty = rows.length === 0;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {loading && (
        <EuiFlexItem grow={false}>
          <EuiProgress size="xs" color="accent" data-test-subj="entityInventoryTableReloading" />
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
          <EntityTableEmpty
            typeName={description.name}
            isIncomplete={errors.length > 0 || total === null}
          />
        ) : (
          <EntityTable
            entityType={description}
            list={list}
            preferences={preferences}
            onPreferencesChange={onPreferencesChange}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
