/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import type {
  CriteriaWithPagination,
  Direction,
  EuiBasicTableColumn,
  Pagination,
} from '@elastic/eui';
import {
  EuiAvatar,
  EuiBadge,
  EuiBadgeGroup,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { OperatingSystem } from '@kbn/securitysolution-utils';
import type { ExceptionListItemSchema, OsType } from '@kbn/securitysolution-io-ts-list-types';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { OS_TITLES } from '../../../common/translations';
import { ActionsContextMenu } from '../../actions_context_menu';
import type { ContextMenuItemNavByRouterProps } from '../../context_menu_with_router_support';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useArtifactActionsDisabled } from '../../../hooks/artifacts';
import type { MaybeImmutable } from '../../../../../common/endpoint/types';
import type { artifactListPageLabels } from '../translations';
import { useArtifactAssignedPolicies } from '../hooks/use_artifact_assigned_policies';
import { PolicyAssignmentCell } from './policy_assignment_cell';

const EMPTY_OS_TYPES: OsType[] = [];

const getOsTitle = (os: OsType): string => OS_TITLES[os as OperatingSystem] ?? os;

export type ArtifactSimpleTableActionType = 'edit' | 'delete';

export interface ArtifactSimpleTableProps {
  items: MaybeImmutable<ExceptionListItemSchema[]>;
  pagination: Pagination;
  onChange: (changes: {
    pageIndex: number;
    pageSize: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }) => void;
  onAction: (action: {
    type: ArtifactSimpleTableActionType;
    item: ExceptionListItemSchema;
  }) => void;
  labels: typeof artifactListPageLabels;
  loading?: boolean;
  error?: string;
  allowCardEditAction?: boolean;
  allowCardDeleteAction?: boolean;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  'data-test-subj'?: string;
}

const ArtifactSimpleTableRowActions = memo<{
  item: ExceptionListItemSchema;
  actionItems: ContextMenuItemNavByRouterProps[];
  'data-test-subj'?: string;
}>(({ item, actionItems, 'data-test-subj': dataTestSubj }) => {
  const { isDisabled, disabledTooltip } = useArtifactActionsDisabled(item);

  return (
    <ActionsContextMenu
      items={actionItems}
      icon="boxesVertical"
      isDisabled={isDisabled}
      disabledTooltip={disabledTooltip}
      data-test-subj={dataTestSubj}
    />
  );
});
ArtifactSimpleTableRowActions.displayName = 'ArtifactSimpleTableRowActions';

export const ArtifactSimpleTable = memo<ArtifactSimpleTableProps>(
  ({
    items,
    pagination,
    onChange,
    onAction,
    labels,
    loading = false,
    error,
    allowCardEditAction = true,
    allowCardDeleteAction = true,
    sortField,
    sortOrder,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const tableItems = items as ExceptionListItemSchema[];
    const { policies, isLoading: loadingPoliciesList } = useArtifactAssignedPolicies(tableItems);

    const handleTableChange = useCallback(
      ({ page, sort }: CriteriaWithPagination<ExceptionListItemSchema>) => {
        if (!page) {
          return;
        }

        onChange({
          pageIndex: page.index,
          pageSize: page.size,
          ...(sort
            ? {
                sortField: sort.field as string,
                sortOrder: sort.direction,
              }
            : {}),
        });
      },
      [onChange]
    );

    const columns = useMemo<Array<EuiBasicTableColumn<ExceptionListItemSchema>>>(() => {
      const tableColumns: Array<EuiBasicTableColumn<ExceptionListItemSchema>> = [
        {
          field: 'name',
          name: labels.tableColumnNameLabel,
          truncateText: true,
          sortable: true,
          render: (name: string) => (
            <EuiToolTip content={name} anchorClassName="eui-textTruncate">
              <EuiText
                size="s"
                className="eui-textTruncate"
                tabIndex={0}
                data-test-subj={getTestId('columnName')}
              >
                {name}
              </EuiText>
            </EuiToolTip>
          ),
        },
        {
          name: labels.tableColumnPolicyAssignmentLabel,
          truncateText: true,
          render: (item: ExceptionListItemSchema) => (
            <PolicyAssignmentCell
              item={item}
              policies={policies}
              loadingPoliciesList={loadingPoliciesList}
              labels={labels}
              data-test-subj={getTestId('columnPolicyAssignment')}
            />
          ),
        },
        {
          field: 'os_types',
          name: labels.tableColumnOperatingSystemsLabel,
          render: (osTypes: ExceptionListItemSchema['os_types']) => (
            <EuiBadgeGroup gutterSize="s" data-test-subj={getTestId('columnOs')}>
              {(osTypes ?? EMPTY_OS_TYPES).map((os) => (
                <EuiBadge key={os} color="hollow" data-test-subj={getTestId(`osBadge-${os}`)}>
                  {getOsTitle(os)}
                </EuiBadge>
              ))}
            </EuiBadgeGroup>
          ),
        },
        {
          field: 'updated_by',
          name: labels.tableColumnUpdatedByLabel,
          sortable: true,
          render: (updatedBy: string) => (
            <EuiFlexGroup
              responsive={false}
              gutterSize="s"
              alignItems="center"
              wrap={false}
              data-test-subj={getTestId('columnUpdatedBy')}
            >
              <EuiFlexItem grow={false}>
                <EuiAvatar
                  name={updatedBy}
                  size="s"
                  aria-hidden={true}
                  data-test-subj={getTestId('columnUpdatedByAvatar')}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false} className="eui-textTruncate">
                <EuiToolTip content={updatedBy} anchorClassName="eui-textTruncate">
                  <EuiText
                    size="s"
                    className="eui-textTruncate"
                    tabIndex={0}
                    data-test-subj={getTestId('columnUpdatedByName')}
                  >
                    {updatedBy}
                  </EuiText>
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
        },
        {
          field: 'updated_at',
          name: labels.tableColumnLastUpdatedLabel,
          truncateText: true,
          sortable: true,
          render: (updatedAt: string) => (
            <span data-test-subj={getTestId('columnUpdatedAt')} className="eui-textTruncate">
              <FormattedDate
                fieldName={labels.tableColumnLastUpdatedLabel}
                value={updatedAt}
                className="eui-textTruncate"
              />
            </span>
          ),
        },
      ];

      if (allowCardEditAction || allowCardDeleteAction) {
        tableColumns.push({
          field: '',
          name: labels.tableColumnActionsLabel,
          width: '65px',
          actions: [
            {
              render: (item: ExceptionListItemSchema) => {
                const actionItems: ContextMenuItemNavByRouterProps[] = [];

                if (allowCardEditAction) {
                  actionItems.push({
                    icon: 'controls',
                    onClick: () => {
                      onAction({ type: 'edit', item });
                    },
                    'data-test-subj': getTestId('cardEditAction'),
                    children: labels.cardActionEditLabel,
                  });
                }

                if (allowCardDeleteAction) {
                  actionItems.push({
                    icon: 'trash',
                    onClick: () => {
                      onAction({ type: 'delete', item });
                    },
                    'data-test-subj': getTestId('cardDeleteAction'),
                    children: labels.cardActionDeleteLabel,
                  });
                }

                return (
                  <ArtifactSimpleTableRowActions
                    item={item}
                    actionItems={actionItems}
                    data-test-subj={getTestId('rowActions')}
                  />
                );
              },
            },
          ],
        });
      }

      return tableColumns;
    }, [
      allowCardDeleteAction,
      allowCardEditAction,
      getTestId,
      labels,
      loadingPoliciesList,
      onAction,
      policies,
    ]);

    const sorting = useMemo(() => {
      if (!sortField || !sortOrder) {
        return { sort: undefined };
      }

      return {
        sort: {
          field: sortField as keyof ExceptionListItemSchema,
          direction: sortOrder as Direction,
        },
      };
    }, [sortField, sortOrder]);

    return (
      <EuiBasicTable<ExceptionListItemSchema>
        items={tableItems}
        columns={columns}
        itemId="id"
        loading={loading}
        error={error}
        pagination={pagination}
        sorting={sorting}
        onChange={handleTableChange}
        noItemsMessage={
          <div data-test-subj={getTestId('noResults')}>{labels.tableNoItemsMessage}</div>
        }
        tableCaption={labels.pageTitle}
        data-test-subj={dataTestSubj}
      />
    );
  }
);

ArtifactSimpleTable.displayName = 'ArtifactSimpleTable';
