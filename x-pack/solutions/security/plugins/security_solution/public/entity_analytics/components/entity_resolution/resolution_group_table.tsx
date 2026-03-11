/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiText,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ResolutionGroup } from './hooks/use_resolution_group';
import {
  getEntityName,
  getEntityId,
  getEntitySource,
  getEntityRiskScore,
  getResolutionRiskScore,
  type TableEntityRow,
} from './helpers';
import {
  ENTITY_NAME_COLUMN,
  ENTITY_ID_COLUMN,
  SOURCE_COLUMN,
  RISK_SCORE_COLUMN,
  ACTIONS_COLUMN,
  REMOVE_ENTITY_BUTTON,
  TARGET_ENTITY_TOOLTIP,
  RESOLUTION_EMPTY_STATE,
} from './translations';
import { RESOLUTION_GROUP_TABLE_TEST_ID, RESOLUTION_EMPTY_STATE_TEST_ID } from './test_ids';

export interface ResolutionGroupTableProps {
  group: ResolutionGroup | null;
  isLoading: boolean;
  showActions?: boolean;
  onRemoveEntity?: (entityId: string) => void;
  targetEntityId?: string;
  isRemovingEntity?: boolean;
}

const truncatedCellCss = css`
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const ResolutionGroupTable: React.FC<ResolutionGroupTableProps> = ({
  group,
  isLoading,
  showActions = false,
  onRemoveEntity,
  targetEntityId,
  isRemovingEntity = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const hasGroup = group && group.group_size > 1;

  const items: TableEntityRow[] = useMemo(() => {
    if (!hasGroup) return [];

    const entityRows: TableEntityRow[] = [
      { entity: group.target, isSummary: false },
      ...group.aliases.map((alias) => ({ entity: alias, isSummary: false })),
    ];

    // Add summary footer row
    entityRows.push({ entity: group.target, isSummary: true });

    return entityRows;
  }, [group, hasGroup]);

  const columns: Array<EuiBasicTableColumn<TableEntityRow>> = useMemo(() => {
    const cols: Array<EuiBasicTableColumn<TableEntityRow>> = [
      {
        name: ENTITY_NAME_COLUMN,
        render: ({ entity, isSummary }: TableEntityRow) => {
          const name = getEntityName(entity);
          if (isSummary) {
            return (
              <EuiFlexGroup
                gutterSize="xs"
                alignItems="center"
                responsive={false}
                css={truncatedCellCss}
              >
                <EuiFlexItem grow={false} css={truncatedCellCss}>
                  <EuiText size="s" css={truncatedCellCss}>
                    <strong>{name}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIconTip content={TARGET_ENTITY_TOOLTIP} type="info" />
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          }
          return (
            <EuiText size="s" css={truncatedCellCss}>
              {name}
            </EuiText>
          );
        },
      },
      {
        name: ENTITY_ID_COLUMN,
        render: ({ entity, isSummary }: TableEntityRow) => {
          if (isSummary) return null;
          return (
            <EuiText size="s" css={truncatedCellCss} title={getEntityId(entity)}>
              {getEntityId(entity)}
            </EuiText>
          );
        },
      },
      {
        name: SOURCE_COLUMN,
        render: ({ entity, isSummary }: TableEntityRow) => {
          if (isSummary) return null;
          return (
            <EuiText size="s" css={truncatedCellCss} title={getEntitySource(entity)}>
              {getEntitySource(entity)}
            </EuiText>
          );
        },
      },
      {
        name: RISK_SCORE_COLUMN,
        width: '100px',
        render: ({ entity, isSummary }: TableEntityRow) => {
          if (isSummary) {
            const resolutionScore = getResolutionRiskScore(entity);
            return (
              <EuiText size="s">
                <strong>{resolutionScore != null ? Math.round(resolutionScore) : '-'}</strong>
              </EuiText>
            );
          }
          const score = getEntityRiskScore(entity);
          return <EuiText size="s">{score != null ? Math.round(score) : '-'}</EuiText>;
        },
      },
    ];

    if (showActions) {
      cols.push({
        name: ACTIONS_COLUMN,
        width: '60px',
        render: ({ entity, isSummary }: TableEntityRow) => {
          if (isSummary) return null;
          const entityId = getEntityId(entity);
          const isTarget = entityId === targetEntityId;
          return (
            <EuiButtonIcon
              iconType="cross"
              color="danger"
              aria-label={REMOVE_ENTITY_BUTTON}
              disabled={isTarget || isRemovingEntity}
              onClick={() => onRemoveEntity?.(entityId)}
              isLoading={isRemovingEntity}
            />
          );
        },
      });
    }

    return cols;
  }, [showActions, targetEntityId, onRemoveEntity, isRemovingEntity]);

  const getRowProps = useCallback(
    (item: TableEntityRow) => {
      if (item.isSummary) {
        return {
          css: css`
            & > td {
              border-bottom: none;
              ${!showActions ? `background-color: ${euiTheme.colors.backgroundBaseSubdued};` : ''}
            }
          `,
        };
      }
      return {};
    },
    [showActions, euiTheme]
  );

  if (isLoading) {
    return <EuiLoadingSpinner size="m" />;
  }

  if (!hasGroup) {
    return (
      <EuiText size="s" color="subdued" data-test-subj={RESOLUTION_EMPTY_STATE_TEST_ID}>
        {RESOLUTION_EMPTY_STATE}
      </EuiText>
    );
  }

  return (
    <EuiBasicTable
      data-test-subj={RESOLUTION_GROUP_TABLE_TEST_ID}
      items={items}
      columns={columns}
      rowProps={getRowProps}
      compressed
    />
  );
};
