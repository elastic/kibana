/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiAccordion,
  EuiBasicTable,
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { EuiBasicTableColumn, CriteriaWithPagination } from '@elastic/eui';
import type { EntityType } from '@kbn/entity-store/public';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { useSearchEntities } from './hooks/use_search_entities';
import {
  getEntityName,
  getEntityId,
  getEntitySource,
  getEntityRiskScore,
  getEntityLastSeen,
  truncatedCellCss,
} from './helpers';
import {
  ADD_ENTITIES_TITLE,
  SEARCH_ENTITIES_PLACEHOLDER,
  ADD_ENTITY_BUTTON,
  EXPAND_ENTITY_BUTTON,
  ENTITY_NAME_COLUMN,
  ENTITY_ID_COLUMN,
  SOURCE_COLUMN,
  LAST_SEEN_COLUMN,
  RISK_SCORE_COLUMN,
  ACTIONS_COLUMN,
} from './translations';
import {
  ADD_ENTITIES_SECTION_TEST_ID,
  ADD_ENTITIES_SEARCH_TEST_ID,
  ADD_ENTITIES_TABLE_TEST_ID,
  ADD_ENTITIES_ACCORDION_TEST_ID,
  ADD_ENTITIES_SHOWING_TEST_ID,
} from './test_ids';
import { RiskScoreCell } from '../home/entities_table/risk_score_cell';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];
const SEARCH_DEBOUNCE_MS = 300;

interface AddEntitiesSectionProps {
  entityType: EntityType;
  excludeEntityIds: string[];
  onAddEntity: (entity: Record<string, unknown>) => void;
  onEntityNameClick?: (entity: Record<string, unknown>) => void;
  addingEntityId?: string;
  disabled?: boolean;
}

export const AddEntitiesSection: React.FC<AddEntitiesSectionProps> = ({
  entityType,
  excludeEntityIds,
  disabled,
  onAddEntity,
  onEntityNameClick,
  addingEntityId,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
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
    perPage: pageSize,
  });

  const records = data?.records ?? [];
  const total = data?.total ?? 0;

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  const handlePageChange = useCallback(
    ({ page: paginationPage }: CriteriaWithPagination<Record<string, unknown>>) => {
      setPage(paginationPage.index + 1);
      setPageSize(paginationPage.size);
    },
    []
  );

  const columns: Array<EuiBasicTableColumn<Record<string, unknown>>> = useMemo(
    () => [
      {
        name: ACTIONS_COLUMN,
        width: '80px',
        render: (entity: Record<string, unknown>) => {
          const entityId = getEntityId(entity);
          const isThisEntityAdding = addingEntityId === entityId;
          return (
            <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="expand"
                  color="primary"
                  aria-label={EXPAND_ENTITY_BUTTON}
                  onClick={() => onEntityNameClick?.(entity)}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="plus"
                  color="primary"
                  aria-label={ADD_ENTITY_BUTTON}
                  onClick={() => onAddEntity(entity)}
                  disabled={disabled || !!addingEntityId}
                  isLoading={isThisEntityAdding}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        name: ENTITY_NAME_COLUMN,
        render: (entity: Record<string, unknown>) => (
          <EuiText size="xs" css={truncatedCellCss}>
            {getEntityName(entity)}
          </EuiText>
        ),
      },
      {
        name: ENTITY_ID_COLUMN,
        render: (entity: Record<string, unknown>) => (
          <EuiText size="xs" css={truncatedCellCss} title={getEntityId(entity)}>
            {getEntityId(entity)}
          </EuiText>
        ),
      },
      {
        name: SOURCE_COLUMN,
        render: (entity: Record<string, unknown>) => (
          <EuiText size="xs" css={truncatedCellCss} title={getEntitySource(entity)}>
            {getEntitySource(entity)}
          </EuiText>
        ),
      },
      {
        name: LAST_SEEN_COLUMN,
        render: (entity: Record<string, unknown>) => {
          const lastSeen = getEntityLastSeen(entity);
          return (
            <EuiText size="xs" css={truncatedCellCss}>
              {lastSeen ? <FormattedRelativePreferenceDate value={lastSeen} /> : '-'}
            </EuiText>
          );
        },
      },
      {
        name: RISK_SCORE_COLUMN,
        width: '100px',
        render: (entity: Record<string, unknown>) => {
          const score = getEntityRiskScore(entity);
          return <RiskScoreCell riskScore={score} />;
        },
      },
    ],
    [onAddEntity, onEntityNameClick, addingEntityId, disabled]
  );

  const pagination = useMemo(
    () => ({
      pageIndex: page - 1,
      pageSize,
      totalItemCount: total,
      showPerPageOptions: true,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
    }),
    [page, pageSize, total]
  );

  const from = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);

  return (
    <EuiAccordion
      id="addEntitiesToResolutionGroup"
      buttonContent={ADD_ENTITIES_TITLE}
      initialIsOpen={false}
      data-test-subj={ADD_ENTITIES_ACCORDION_TEST_ID}
    >
      <div data-test-subj={ADD_ENTITIES_SECTION_TEST_ID}>
        <EuiSpacer size="m" />
        <EuiFieldSearch
          data-test-subj={ADD_ENTITIES_SEARCH_TEST_ID}
          placeholder={SEARCH_ENTITIES_PLACEHOLDER}
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          isClearable
          fullWidth
        />
        <EuiSpacer size="m" />
        {total > 0 && (
          <>
            <EuiText size="xs" data-test-subj={ADD_ENTITIES_SHOWING_TEST_ID}>
              <FormattedMessage
                id="xpack.securitySolution.entityResolution.showingEntities"
                defaultMessage="Showing {range} of {total} entities"
                values={{
                  range: (
                    <strong>
                      {from}
                      {'-'}
                      {to}
                    </strong>
                  ),
                  total: <strong>{total.toLocaleString()}</strong>,
                }}
              />
            </EuiText>
            <EuiSpacer size="s" />
          </>
        )}
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
    </EuiAccordion>
  );
};
