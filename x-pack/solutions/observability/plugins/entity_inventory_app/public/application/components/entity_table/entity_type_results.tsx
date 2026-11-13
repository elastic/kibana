/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiProgress,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { InventoryType, SourceError } from '@kbn/entity-inventory-plugin/common';
import { useEntityTablePreferences } from '../../context/entity_table_preferences_context';
import type { UseEntityListResult } from '../../hooks/use_entity_list';
import { useEntityList } from '../../hooks/use_entity_list';
import { EntityTable } from './entity_table';
import { EntityTableEmpty, EntityTableLoadError, EntityTableSkeleton } from './entity_table_states';
import {
  ENTITY_COUNT_LABEL,
  SOURCE_ERRORS_TITLE,
  getEntityCountValue,
  getSourceErrorText,
} from './translations';

/** A warning icon whose tooltip lists each source of `errors` that failed. */
const SourceErrorsIndicator = ({ errors }: { errors: readonly SourceError[] }) => (
  <EuiIconTip
    type="warning"
    color="warning"
    title={SOURCE_ERRORS_TITLE}
    aria-label={SOURCE_ERRORS_TITLE}
    content={
      <ul>
        {/* Both plans of one source can fail, so an index pattern can appear twice. */}
        {errors.map((sourceError, index) => (
          <li key={index}>{getSourceErrorText(sourceError)}</li>
        ))}
      </ul>
    }
    iconProps={{ 'data-test-subj': 'entityInventorySourceErrorsIndicator' }}
  />
);

export interface EntityTypeResultsProps {
  entityType: InventoryType;
  /** Called with `true` while the section shows a truncated list with rows, else `false`. */
  onTruncatedChange: (type: string, truncated: boolean) => void;
}

/**
 * One entity type as a collapsible section: its name from the `types` entry, the number of listed
 * entities once its `_list` response arrives, and its results below. Each section loads and fails
 * on its own.
 */
export const EntityTypeResults = ({ entityType, onTruncatedChange }: EntityTypeResultsProps) => {
  const { type, name } = entityType;
  const accordionId = useGeneratedHtmlId({ prefix: 'entityInventoryTypeSection' });
  const listResult = useEntityList(type);
  // `list` is `undefined` after a failed load and during its retry, so nothing of the previous
  // response shows beside the error.
  const { list } = listResult;
  const isTruncated = list !== undefined && list.truncated && list.rows.length > 0;

  useEffect(() => {
    onTruncatedChange(type, isTruncated);
    return () => onTruncatedChange(type, false);
  }, [type, isTruncated, onTruncatedChange]);

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
              {list.errors.length > 0 && (
                <EuiFlexItem grow={false}>
                  <SourceErrorsIndicator errors={list.errors} />
                </EuiFlexItem>
              )}
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
  entityType: InventoryType;
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
    return <EntityTableSkeleton />;
  }

  const { rows, errors } = list;
  const isEmpty = rows.length === 0;

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
