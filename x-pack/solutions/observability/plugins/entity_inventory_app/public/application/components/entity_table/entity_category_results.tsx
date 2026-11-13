/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useEntityTypes } from '../../context/entity_types_context';
import { EntitySection } from './entity_section';
import { EntityTableTruncationCallout } from './entity_table_callouts';
import {
  EntityTableLoadError,
  EntityTableLoading,
  EntityTableTypeNotAvailable,
} from './entity_table_states';

/** Reported as the click detail of the retry after the type list failed to load. */
const TYPES_EBT_DETAIL = 'types';

export interface EntityCategoryResultsProps {
  /** Lists every type whose id starts with this prefix; when absent, every type of the `types` response. */
  entityTypeIdPrefix?: string;
}

/**
 * One section per entity type of the page, in the order of the `types` response. A prefix that no
 * type of the response starts with gets a "not available" prompt instead of a section.
 * One truncation callout shows above the sections while any of their lists is truncated.
 */
export const EntityCategoryResults = ({ entityTypeIdPrefix }: EntityCategoryResultsProps) => {
  const { data: availableEntityTypes, loading, error, refresh } = useEntityTypes();
  const [isTruncated, setIsTruncated] = useState(false);

  if (error && !loading) {
    return (
      <EntityTableLoadError
        ebtDetail={TYPES_EBT_DETAIL}
        message={error.message}
        onRetry={refresh}
      />
    );
  }
  // Only a reload has types to keep: a first load and a retry after a failure both start from
  // the initial, empty list.
  if (loading && availableEntityTypes.length === 0) {
    return <EntityTableLoading />;
  }

  const pageTypes = availableEntityTypes.filter(({ type }) =>
    type.startsWith(entityTypeIdPrefix ?? '')
  );
  const isPrefixUnmatched = Boolean(entityTypeIdPrefix) && pageTypes.length === 0;

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {isTruncated && (
        <EuiFlexItem grow={false}>
          <EntityTableTruncationCallout />
        </EuiFlexItem>
      )}
      {pageTypes.map((entityType) => (
        <EuiFlexItem key={entityType.type} grow={false}>
          <EntitySection entityType={entityType} onTruncatedChange={setIsTruncated} />
        </EuiFlexItem>
      ))}
      {isPrefixUnmatched && (
        <EuiFlexItem grow={false}>
          <EntityTableTypeNotAvailable entityType={`${entityTypeIdPrefix}*`} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
