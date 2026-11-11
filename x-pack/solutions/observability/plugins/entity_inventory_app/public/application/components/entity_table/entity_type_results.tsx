/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiProgress,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { InventoryEntityType } from '../../../inventory_api/types';
import { useEntityTablePreferences } from '../../context/entity_table_preferences_context';
import type { UseEntityListResult } from '../../hooks/use_entity_list';
import { useEntityList } from '../../hooks/use_entity_list';
import { EntityTable } from './entity_table';
import {
  EntityTableDiagnosticsCallout,
  EntityTableTruncationCallout,
} from './entity_table_callouts';
import { EntityTableEmpty, EntityTableLoadError, EntityTableLoading } from './entity_table_states';
import { ENTITY_COUNT_LABEL, getEntityCountValue } from './translations';

/**
 * One entity type as a collapsible section: its name from the `types` entry, the number of listed
 * entities once its `_list` response arrives, and its results below. Each section loads and fails
 * on its own.
 */
export const EntityTypeResults = ({ entityType }: { entityType: InventoryEntityType }) => {
  const { type, name } = entityType;
  const accordionId = useGeneratedHtmlId({ prefix: 'entityInventoryTypeSection' });
  const listResult = useEntityList(type);
  const { list } = listResult;

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      data-test-subj="entityInventoryTypeSection"
      data-entity-type={type}
    >
      <EuiAccordion
        id={accordionId}
        initialIsOpen
        buttonContent={
          <EuiTitle size="xs">
            <h3>{name}</h3>
          </EuiTitle>
        }
        extraAction={
          list && (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{ENTITY_COUNT_LABEL}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj="entityInventoryTypeSectionCount">
                  {getEntityCountValue({ count: list.rows.length, truncated: list.truncated })}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          )
        }
        paddingSize="s"
      >
        <EntityTypeListResults entityType={entityType} listResult={listResult} />
      </EuiAccordion>
    </EuiPanel>
  );
};

interface EntityTypeListResultsProps {
  entityType: InventoryEntityType;
  listResult: UseEntityListResult;
}

/** The list of one type with its loading, error, empty and partial states. */
const EntityTypeListResults = ({ entityType, listResult }: EntityTypeListResultsProps) => {
  const { type, name } = entityType;
  const { list, loading, error, refresh } = listResult;
  // The column, sort and page size choices are kept per type above the routes, in
  // `EntityTablePreferencesProvider`, so an empty range, a failed load or another page does not
  // discard them.
  const { preferences, onPreferencesChange } = useEntityTablePreferences(type);

  // A failed reload replaces the results of the last range rather than leaving them up as current.
  if (error && !loading) {
    return <EntityTableLoadError ebtDetail={type} message={error.message} onRetry={refresh} />;
  }
  if (!list) {
    return <EntityTableLoading />;
  }

  const { rows, truncated, errors, unavailableColumns } = list;
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
          <EntityTableTruncationCallout returned={rows.length} />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        {isEmpty ? (
          <EntityTableEmpty typeName={name} isIncomplete={errors.length > 0} />
        ) : (
          <EntityTable
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
