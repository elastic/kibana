/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiFieldSearch,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiBasicTableColumn, CriteriaWithPagination } from '@elastic/eui';
import type { EntityType } from '@kbn/entity-store/public';
import { useSearchEntities } from './hooks/use_search_entities';
import {
  getEntityName,
  getEntityId,
  getEntitySource,
  getEntityRiskScore,
  truncatedCellCss,
} from './helpers';
import {
  ADD_ENTITIES_TITLE,
  SEARCH_ENTITIES_PLACEHOLDER,
  ADD_ENTITY_BUTTON,
  ENTITY_NAME_COLUMN,
  ENTITY_ID_COLUMN,
  SOURCE_COLUMN,
  RISK_SCORE_COLUMN,
} from './translations';
import {
  ADD_ENTITIES_SECTION_TEST_ID,
  ADD_ENTITIES_SEARCH_TEST_ID,
  ADD_ENTITIES_TABLE_TEST_ID,
} from './test_ids';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

interface AddEntitiesSectionProps {
  entityType: EntityType;
  excludeEntityIds: string[];
  onAddEntity: (entity: Record<string, unknown>) => void;
  addingEntityId?: string;
  disabled?: boolean;
}

export const AddEntitiesSection: React.FC<AddEntitiesSectionProps> = ({
  entityType,
  excludeEntityIds,
  disabled,
  onAddEntity,
  addingEntityId,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(debounceTimerRef.current);
  }, [searchInput]);

  const { data, isLoading } = useSearchEntities({
    entityType,
    excludeEntityIds,
    searchQuery: debouncedQuery,
    page,
    perPage: PAGE_SIZE,
  });

  const records = data?.records ?? [];
  const total = data?.total ?? 0;

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  const handlePageChange = useCallback(
    ({ page: paginationPage }: CriteriaWithPagination<Record<string, unknown>>) => {
      setPage(paginationPage.index + 1);
    },
    []
  );

  const columns: Array<EuiBasicTableColumn<Record<string, unknown>>> = useMemo(
    () => [
      {
        name: ENTITY_NAME_COLUMN,
        render: (entity: Record<string, unknown>) => (
          <EuiText size="s" css={truncatedCellCss}>
            {getEntityName(entity)}
          </EuiText>
        ),
      },
      {
        name: ENTITY_ID_COLUMN,
        render: (entity: Record<string, unknown>) => (
          <EuiText size="s" css={truncatedCellCss} title={getEntityId(entity)}>
            {getEntityId(entity)}
          </EuiText>
        ),
      },
      {
        name: SOURCE_COLUMN,
        render: (entity: Record<string, unknown>) => (
          <EuiText size="s" css={truncatedCellCss} title={getEntitySource(entity)}>
            {getEntitySource(entity)}
          </EuiText>
        ),
      },
      {
        name: RISK_SCORE_COLUMN,
        width: '100px',
        render: (entity: Record<string, unknown>) => {
          const score = getEntityRiskScore(entity);
          return <EuiText size="s">{score != null ? Math.round(score) : '-'}</EuiText>;
        },
      },
      {
        name: '',
        width: '60px',
        render: (entity: Record<string, unknown>) => {
          const entityId = getEntityId(entity);
          const isThisEntityAdding = addingEntityId === entityId;
          return (
            <EuiButtonIcon
              iconType="plusInCircle"
              color="primary"
              aria-label={ADD_ENTITY_BUTTON}
              onClick={() => onAddEntity(entity)}
              disabled={disabled || !!addingEntityId}
              isLoading={isThisEntityAdding}
            />
          );
        },
      },
    ],
    [onAddEntity, addingEntityId, disabled]
  );

  const pagination = useMemo(
    () => ({
      pageIndex: page - 1,
      pageSize: PAGE_SIZE,
      totalItemCount: total,
      showPerPageOptions: false,
    }),
    [page, total]
  );

  return (
    <div data-test-subj={ADD_ENTITIES_SECTION_TEST_ID}>
      <EuiTitle size="xs">
        <h3>{ADD_ENTITIES_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFieldSearch
        data-test-subj={ADD_ENTITIES_SEARCH_TEST_ID}
        placeholder={SEARCH_ENTITIES_PLACEHOLDER}
        value={searchInput}
        onChange={(e) => handleSearchChange(e.target.value)}
        isClearable
        fullWidth
      />
      <EuiSpacer size="s" />
      <EuiBasicTable
        data-test-subj={ADD_ENTITIES_TABLE_TEST_ID}
        items={records}
        columns={columns}
        loading={isLoading}
        pagination={pagination}
        onChange={handlePageChange}
        compressed
      />
    </div>
  );
};
