/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useEntityTypes } from '../../context/entity_types_context';
import { EntityTypeResults } from './entity_type_results';
import {
  EntityTableLoadError,
  EntityTableLoading,
  EntityTableTypeNotAvailable,
} from './entity_table_states';

/** Reported as the click detail of the retry after the type list failed to load. */
const TYPES_EBT_DETAIL = 'types';

/**
 * One section per entity type of the page, in the order of the `types` response. A type the page
 * asks for that the response does not have gets a "not available" prompt instead of a section.
 */
export const EntityCategoryResults = ({ entityTypes }: { entityTypes: readonly string[] }) => {
  const { types, loading, error, refresh } = useEntityTypes();

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

  const pageTypes = types.filter(({ type }) => entityTypes.includes(type));
  const missingTypes = entityTypes.filter((id) => !types.some(({ type }) => type === id));

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {pageTypes.map((entityType) => (
        <EuiFlexItem key={entityType.type} grow={false}>
          <EntityTypeResults entityType={entityType} />
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
