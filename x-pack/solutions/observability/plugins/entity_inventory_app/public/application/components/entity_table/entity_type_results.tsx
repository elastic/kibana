/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiProgress,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import {
  ENTITY_INVENTORY_EBT_ACTIONS,
  ENTITY_INVENTORY_EBT_ELEMENTS,
} from '../../../ebt_constants';
import { EntityTypeNotFoundError, useEntityList } from '../../hooks/use_entity_list';
import { EntityTable } from './entity_table';
import {
  EntityTableDiagnosticsCallout,
  EntityTableTruncationCallout,
} from './entity_table_callouts';
import {
  EMPTY_BODY,
  LOADING_ENTITIES_LABEL,
  LOAD_ERROR_TITLE,
  RETRY_LABEL,
  getEmptyTitle,
  getTypeNotAvailableTitle,
} from './translations';

/** The results of one entity type over the committed time range, with its loading states. */
export const EntityTypeResults = ({ entityType }: { entityType: string }) => {
  const { entityType: description, list, loading, error, refresh } = useEntityList(entityType);

  if (!description || !list) {
    if (error instanceof EntityTypeNotFoundError) {
      return (
        <EuiEmptyPrompt
          iconType="magnify"
          title={<h2>{getTypeNotAvailableTitle(entityType)}</h2>}
          data-test-subj="entityInventoryTypeNotAvailable"
        />
      );
    }
    if (error && !loading) {
      return (
        <EuiEmptyPrompt
          color="danger"
          iconType="warning"
          title={<h2>{LOAD_ERROR_TITLE}</h2>}
          body={<p>{error.message}</p>}
          actions={
            <EuiButton
              color="danger"
              onClick={refresh}
              data-test-subj="entityInventoryTableRetry"
              {...getEbtProps({
                action: ENTITY_INVENTORY_EBT_ACTIONS.RETRY_LOAD,
                element: ENTITY_INVENTORY_EBT_ELEMENTS.ENTITY_TABLE,
                detail: entityType,
              })}
            >
              {RETRY_LABEL}
            </EuiButton>
          }
          data-test-subj="entityInventoryTableError"
        />
      );
    }
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingSpinner size="xl" />}
        title={<h2>{LOADING_ENTITIES_LABEL}</h2>}
        data-test-subj="entityInventoryTableLoading"
      />
    );
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
      {/* With no rows the empty prompt says enough; "showing the 0 most recent" would not help. */}
      {truncated && !isEmpty && (
        <EuiFlexItem grow={false}>
          <EntityTableTruncationCallout returned={rows.length} total={total} />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        {isEmpty ? (
          <EuiEmptyPrompt
            iconType="magnify"
            title={<h2>{getEmptyTitle(description.name)}</h2>}
            body={<p>{EMPTY_BODY}</p>}
            data-test-subj="entityInventoryTableEmpty"
          />
        ) : (
          <EntityTable entityType={description} list={list} />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
