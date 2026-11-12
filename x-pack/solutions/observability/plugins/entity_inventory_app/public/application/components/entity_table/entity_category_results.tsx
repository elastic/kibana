/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useEntityTypes } from '../../context/entity_types_context';
import { EntityTypeResults } from './entity_type_results';
import { EntityTableTruncationCallout } from './entity_table_callouts';
import {
  EntityTableLoadError,
  EntityTableLoading,
  EntityTableTypeNotAvailable,
} from './entity_table_states';

/** Reported as the click detail of the retry after the type list failed to load. */
const TYPES_EBT_DETAIL = 'types';

export interface EntityCategoryResultsProps {
  /** The type ids the page lists; when absent, every type of the `types` response is listed. */
  entityTypes?: readonly string[];
  /** Lists every type whose id starts with this prefix, in addition to `entityTypes`. */
  entityTypePrefix?: string;
}

/**
 * One section per entity type of the page, in the order of the `types` response. A type the page
 * asks for that the response does not have gets a "not available" prompt instead of a section.
 * One truncation callout above the sections names every type whose shown list was truncated.
 */
export const EntityCategoryResults = ({
  entityTypes,
  entityTypePrefix,
}: EntityCategoryResultsProps) => {
  const { types, loading, error, refresh } = useEntityTypes();
  const [truncatedTypes, setTruncatedTypes] = useState<ReadonlySet<string>>(() => new Set());
  const onTruncatedChange = useCallback((type: string, truncated: boolean) => {
    setTruncatedTypes((previous) => {
      if (previous.has(type) === truncated) {
        return previous;
      }
      const next = new Set(previous);
      if (truncated) {
        next.add(type);
      } else {
        next.delete(type);
      }
      return next;
    });
  }, []);

  if (error && !loading) {
    return (
      <EntityTableLoadError
        ebtDetail={TYPES_EBT_DETAIL}
        message={error.message}
        onRetry={refresh}
      />
    );
  }
  if (!types) {
    return <EntityTableLoading />;
  }

  const isFiltered = entityTypes !== undefined || entityTypePrefix !== undefined;
  const pageTypes = isFiltered
    ? types.filter(
        ({ type }) =>
          entityTypes?.includes(type) || (entityTypePrefix && type.startsWith(entityTypePrefix))
      )
    : types;
  const missingTypes = (entityTypes ?? []).filter((id) => !types.some(({ type }) => type === id));
  if (entityTypePrefix && !types.some(({ type }) => type.startsWith(entityTypePrefix))) {
    missingTypes.push(`${entityTypePrefix}*`);
  }
  const truncatedTypeNames = pageTypes
    .filter(({ type }) => truncatedTypes.has(type))
    .map(({ name }) => name);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {truncatedTypeNames.length > 0 && (
        <EuiFlexItem grow={false}>
          <EntityTableTruncationCallout typeNames={truncatedTypeNames} />
        </EuiFlexItem>
      )}
      {pageTypes.map((entityType) => (
        <EuiFlexItem key={entityType.type} grow={false}>
          <EntityTypeResults entityType={entityType} onTruncatedChange={onTruncatedChange} />
        </EuiFlexItem>
      ))}
      {missingTypes.map((id) => (
        <EuiFlexItem key={id} grow={false}>
          <EntityTableTypeNotAvailable entityType={id} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
