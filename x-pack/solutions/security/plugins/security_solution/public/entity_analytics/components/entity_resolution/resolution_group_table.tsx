/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiText,
  EuiToolTip,
  EuiLoadingSpinner,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ResolutionGroup } from './hooks/use_resolution_group';
import {
  getEntityName,
  getEntityId,
  getEntitySource,
  getEntityRiskScore,
  truncatedCellCss,
  type TableEntityRow,
} from './helpers';
import {
  ENTITY_NAME_COLUMN,
  ENTITY_ID_COLUMN,
  SOURCE_COLUMN,
  RISK_SCORE_COLUMN,
  ACTIONS_COLUMN,
  EXPAND_ENTITY_BUTTON,
  REMOVE_ENTITY_BUTTON,
  TARGET_ENTITY_TOOLTIP,
  CANNOT_REMOVE_TARGET_TOOLTIP,
  RESOLUTION_EMPTY_STATE,
  RESOLUTION_FETCH_ERROR,
} from './translations';
import {
  RESOLUTION_GROUP_TABLE_TEST_ID,
  RESOLUTION_EMPTY_STATE_TEST_ID,
  RESOLUTION_PRIMARY_ENTITY_ICON_TEST_ID,
} from './test_ids';
import { RiskScoreCell } from '../home/entities_table/risk_score_cell';

export interface ResolutionGroupTableProps {
  group: ResolutionGroup | null;
  isLoading: boolean;
  isError?: boolean;
  showActions?: boolean;
  onRemoveEntity?: (entityId: string) => void;
  targetEntityId?: string;
  removingEntityId?: string;
  onEntityNameClick?: (entity: Record<string, unknown>) => void;
  currentEntityId?: string;
}

export const ResolutionGroupTable: React.FC<ResolutionGroupTableProps> = ({
  group,
  isLoading,
  isError = false,
  showActions = false,
  onRemoveEntity,
  targetEntityId,
  removingEntityId,
  onEntityNameClick,
  currentEntityId,
}) => {
  const hasGroup = group && group.group_size > 1;

  const items: TableEntityRow[] = useMemo(() => {
    if (!hasGroup) return [];

    return [{ entity: group.target }, ...group.aliases.map((alias) => ({ entity: alias }))];
  }, [group, hasGroup]);

  const columns: Array<EuiBasicTableColumn<TableEntityRow>> = useMemo(() => {
    const cols: Array<EuiBasicTableColumn<TableEntityRow>> = [];

    if (showActions) {
      cols.push({
        name: ACTIONS_COLUMN,
        width: '80px',
        render: ({ entity }: TableEntityRow) => {
          const entityId = getEntityId(entity);
          const isTarget = entityId === targetEntityId;
          const isCurrentEntity = currentEntityId === entityId;
          const isThisEntityRemoving = removingEntityId === entityId;

          const expandButton = (
            <EuiButtonIcon
              iconType="expand"
              color={isCurrentEntity ? 'text' : 'primary'}
              aria-label={EXPAND_ENTITY_BUTTON}
              disabled={isCurrentEntity}
              onClick={() => onEntityNameClick?.(entity)}
            />
          );

          const removeButton = (
            <EuiButtonIcon
              iconType="cross"
              color="primary"
              aria-label={REMOVE_ENTITY_BUTTON}
              disabled={isTarget || !!removingEntityId}
              onClick={() => onRemoveEntity?.(entityId)}
              isLoading={isThisEntityRemoving}
            />
          );

          return (
            <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>{expandButton}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                {isTarget ? (
                  <EuiToolTip content={CANNOT_REMOVE_TARGET_TOOLTIP}>{removeButton}</EuiToolTip>
                ) : (
                  removeButton
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      });
    }

    cols.push(
      {
        name: ENTITY_NAME_COLUMN,
        render: ({ entity }: TableEntityRow) => {
          const name = getEntityName(entity);
          const entityId = getEntityId(entity);
          const isTarget = entityId === targetEntityId;
          const isCurrentEntity = currentEntityId === entityId;

          const nameContent =
            onEntityNameClick && !isCurrentEntity && !showActions ? (
              <EuiText size="xs" css={truncatedCellCss}>
                <EuiLink onClick={() => onEntityNameClick(entity)} title={name}>
                  {name}
                </EuiLink>
              </EuiText>
            ) : (
              <EuiText size="xs" css={truncatedCellCss}>
                {name}
              </EuiText>
            );

          if (isTarget) {
            return (
              <EuiFlexGroup
                gutterSize="xs"
                alignItems="center"
                responsive={false}
                css={truncatedCellCss}
              >
                <EuiFlexItem grow={false} css={truncatedCellCss}>
                  {nameContent}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    content={TARGET_ENTITY_TOOLTIP}
                    type="aggregate"
                    size="s"
                    anchorProps={{ 'data-test-subj': RESOLUTION_PRIMARY_ENTITY_ICON_TEST_ID }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          }

          return nameContent;
        },
      },
      {
        name: ENTITY_ID_COLUMN,
        render: ({ entity }: TableEntityRow) => {
          return (
            <EuiText size="xs" css={truncatedCellCss} title={getEntityId(entity)}>
              {getEntityId(entity)}
            </EuiText>
          );
        },
      },
      {
        name: SOURCE_COLUMN,
        render: ({ entity }: TableEntityRow) => {
          return (
            <EuiText size="xs" css={truncatedCellCss} title={getEntitySource(entity)}>
              {getEntitySource(entity)}
            </EuiText>
          );
        },
      },
      {
        name: RISK_SCORE_COLUMN,
        width: '100px',
        render: ({ entity }: TableEntityRow) => {
          const score = getEntityRiskScore(entity);
          return <RiskScoreCell riskScore={score} />;
        },
      }
    );

    return cols;
  }, [
    showActions,
    targetEntityId,
    onRemoveEntity,
    removingEntityId,
    onEntityNameClick,
    currentEntityId,
  ]);

  if (isLoading) {
    return <EuiLoadingSpinner size="m" />;
  }

  if (isError) {
    return (
      <EuiText size="xs" color="danger">
        {RESOLUTION_FETCH_ERROR}
      </EuiText>
    );
  }

  if (!hasGroup) {
    const emptyColumns: Array<EuiBasicTableColumn<TableEntityRow>> = [
      { name: ENTITY_NAME_COLUMN, render: () => null },
      { name: ENTITY_ID_COLUMN, render: () => null },
      { name: SOURCE_COLUMN, render: () => null },
      { name: RISK_SCORE_COLUMN, width: '100px', render: () => null },
    ];

    return (
      <EuiBasicTable
        data-test-subj={RESOLUTION_EMPTY_STATE_TEST_ID}
        items={[]}
        columns={emptyColumns}
        noItemsMessage={RESOLUTION_EMPTY_STATE}
        compressed
      />
    );
  }

  return (
    <EuiBasicTable
      data-test-subj={RESOLUTION_GROUP_TABLE_TEST_ID}
      items={items}
      columns={columns}
      compressed
    />
  );
};
