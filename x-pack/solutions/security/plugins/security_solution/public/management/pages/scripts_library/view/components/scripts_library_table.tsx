/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  EuiAvatar,
  EuiBadge,
  EuiBasicTable,
  EuiFacetButton,
  EuiI18nNumber,
  EuiHorizontalRule,
  EuiText,
  EuiToolTip,
  type CriteriaWithPagination,
  type EuiTableSortingType,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { SupportedHostOsType } from '../../../../../../common/endpoint/constants';
import { SCRIPT_TAGS } from '../../../../../../common/endpoint/service/scripts_library/constants';
import { PopoverItems } from '../../../../../common/components/popover_items';
import { useAppUrl } from '../../../../../common/lib/kibana';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import { useFormatBytes } from '../../../../../common/components/formatted_bytes';
import { MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../../../common/constants';
import { useUrlPagination } from '../../../../hooks/use_url_pagination';
import type { ListScriptsRequestQuery } from '../../../../../../common/api/endpoint';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import type {
  EndpointScript,
  EndpointScriptListApiResponse,
  SortableScriptLibraryFields,
  SortDirection,
} from '../../../../../../common/endpoint/types';
import { scriptsLibraryLabels as tableLabels } from '../../translations';
import { ScriptNameNavLink } from './script_name_nav_link';
import { getScriptsDetailPath } from '../../../../common/url_routing';
import { ScriptTablePlatformBadges } from './platform_badges';

const SCRIPTS_TABLE_COLUMN_WIDTHS = Object.freeze({
  name: '25%',
  platform: '15%',
  tags: '150px',
  updatedBy: '15%',
  updatedAt: '25%',
  size: '5%',
  actions: '65px',
});

interface GetScriptsLibraryTableColumnsProps {
  formatBytes: (bytes: number) => string;
  getAppUrl: ReturnType<typeof useAppUrl>['getAppUrl'];
  getTestId: (suffix?: string | undefined) => string | undefined;
  queryParams: ScriptsLibraryTableProps['queryParams'];
  searchParams: ScriptsLibraryTableProps['searchParams'];
}

const getScriptsLibraryTableColumns = ({
  formatBytes,
  getAppUrl,
  getTestId,
  queryParams,
  searchParams,
}: GetScriptsLibraryTableColumnsProps) => {
  const columns = [
    {
      field: 'name',
      name: tableLabels.table.columns.name,
      sortable: true,
      width: SCRIPTS_TABLE_COLUMN_WIDTHS.name,
      truncateText: true,
      render: (name: string, item: EndpointScript) => {
        const toRoutePath = getScriptsDetailPath({
          query: { ...queryParams, selectedScriptId: item.id, show: 'details' },
          search: searchParams,
        });
        const toRouteUrl = getAppUrl({ path: toRoutePath });
        return (
          <EuiToolTip content={name} anchorClassName="eui-textTruncate">
            <ScriptNameNavLink
              name={name}
              href={toRouteUrl}
              data-test-subj={`${getTestId(`column-name-${item.id}`)}`}
            />
          </EuiToolTip>
        );
      },
    },
    {
      field: 'platform',
      name: tableLabels.table.columns.platform,
      width: SCRIPTS_TABLE_COLUMN_WIDTHS.platform,
      render: (platforms: SupportedHostOsType[]) => (
        <ScriptTablePlatformBadges
          platforms={platforms}
          data-test-subj={getTestId('platform-badges')}
        />
      ),
    },
    {
      field: 'tags',
      name: tableLabels.table.columns.tags,
      width: SCRIPTS_TABLE_COLUMN_WIDTHS.tags,
      render: (tags: string[]) => {
        const renderItem = (sortedTag: string, i: number) => (
          <EuiBadge
            color="hollow"
            key={`${sortedTag}-${i}`}
            data-test-subj={getTestId(`tags-${sortedTag}`)}
          >
            {SCRIPT_TAGS[sortedTag as keyof typeof SCRIPT_TAGS] || sortedTag}
          </EuiBadge>
        );
        return (
          <PopoverItems
            items={tags.sort()}
            popoverTitle={tableLabels.table.columns.tags}
            popoverButtonIcon="tag"
            popoverButtonTitle={tags.length.toString()}
            renderItem={renderItem}
            dataTestPrefix={getTestId('tags')}
          />
        );
      },
    },
    {
      field: 'updatedBy',
      name: tableLabels.table.columns.updatedBy,
      sortable: true,
      width: SCRIPTS_TABLE_COLUMN_WIDTHS.updatedBy,
      render: (updatedBy: string) => (
        <EuiFacetButton
          icon={
            <EuiAvatar
              aria-hidden={true}
              name={updatedBy}
              data-test-subj={getTestId('column-user-avatar')}
              size="s"
            />
          }
        >
          <EuiToolTip content={updatedBy} anchorClassName="eui-textTruncate">
            <EuiText
              size="s"
              className="eui-textTruncate eui-fullWidth"
              data-test-subj={getTestId('column-username')}
              tabIndex={0}
            >
              {updatedBy}
            </EuiText>
          </EuiToolTip>
        </EuiFacetButton>
      ),
    },
    {
      field: 'updatedAt',
      name: tableLabels.table.columns.updatedAt,
      width: SCRIPTS_TABLE_COLUMN_WIDTHS.updatedAt,
      truncateText: true,
      sortable: true,
      render: (updatedAt: string) => {
        return (
          <FormattedDate
            fieldName={tableLabels.table.columns.updatedAt}
            value={updatedAt}
            className="eui-textTruncate"
          />
        );
      },
    },
    {
      field: 'fileSize',
      name: tableLabels.table.columns.size,
      width: SCRIPTS_TABLE_COLUMN_WIDTHS.size,
      render: (fileSize: number) => (
        <EuiText size="s" data-test-subj={getTestId('file-size')}>
          {formatBytes(fileSize).toLowerCase()}
        </EuiText>
      ),
    },
    {
      field: '',
      name: tableLabels.table.columns.actions,
      width: SCRIPTS_TABLE_COLUMN_WIDTHS.actions,
      actions: [],
    },
  ];

  return columns;
};

type OnChangeTable = (criteria: CriteriaWithPagination<EndpointScript>) => void;
type ScriptItems = EndpointScriptListApiResponse['data'];

export interface ScriptsLibraryTableProps {
  'data-test-subj'?: string;
  error?: string;
  isLoading?: boolean;
  items: ScriptItems;
  onChange: OnChangeTable;
  queryParams: ListScriptsRequestQuery;
  searchParams: string;
  sort: {
    field?: SortableScriptLibraryFields;
    direction?: SortDirection;
  };
  totalItemCount: number;
}
export const ScriptsLibraryTable = memo<ScriptsLibraryTableProps>(
  ({
    'data-test-subj': dataTestSubj,
    error,
    isLoading,
    items,
    onChange,
    queryParams,
    searchParams,
    sort,
    totalItemCount,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const { getAppUrl } = useAppUrl();
    const formatBytes = useFormatBytes();
    const { pagination: paginationFromUrlParams } = useUrlPagination();
    const sorting = useMemo(
      () => ({
        sort: {
          field: sort.field ?? queryParams?.sortField,
          direction: sort.direction ?? queryParams?.sortDirection,
        },
      }),
      [queryParams?.sortField, queryParams?.sortDirection, sort.field, sort.direction]
    );

    const tablePagination = useMemo(() => {
      return {
        pageIndex: paginationFromUrlParams.page - 1,
        pageSize: paginationFromUrlParams.pageSize,
        totalItemCount,
        pageSizeOptions: MANAGEMENT_PAGE_SIZE_OPTIONS as number[],
      };
    }, [paginationFromUrlParams.page, paginationFromUrlParams.pageSize, totalItemCount]);

    const pagedResultsCount = useMemo(() => {
      const page = queryParams?.page ?? 1;
      const perPage = queryParams?.pageSize ?? 10;

      const totalPages = Math.ceil(totalItemCount / perPage);
      const fromCount = perPage * page - perPage + 1;
      const toCount =
        page === totalPages || totalPages === 1 ? totalItemCount : fromCount + perPage - 1;
      return { fromCount, toCount };
    }, [queryParams?.page, queryParams?.pageSize, totalItemCount]);

    const recordRangeLabel = useMemo(
      () => (
        <EuiText color="default" size="xs" data-test-subj={getTestId('record-range-label')}>
          <FormattedMessage
            id="xpack.securitySolution.scriptsLibrary.list.recordRange"
            defaultMessage="Showing {range} of {total} {recordsLabel}"
            values={{
              range: (
                <strong>
                  <EuiI18nNumber value={pagedResultsCount.fromCount} />
                  {'-'}
                  <EuiI18nNumber value={pagedResultsCount.toCount} />
                </strong>
              ),
              total: <EuiI18nNumber value={totalItemCount} />,
              recordsLabel: <strong>{tableLabels.table.recordsPerPage(totalItemCount)}</strong>,
            }}
          />
        </EuiText>
      ),
      [getTestId, pagedResultsCount.fromCount, pagedResultsCount.toCount, totalItemCount]
    );

    const columns = useMemo(
      () =>
        getScriptsLibraryTableColumns({
          formatBytes,
          getTestId,
          getAppUrl,
          queryParams,
          searchParams,
        }),
      [formatBytes, getTestId, getAppUrl, queryParams, searchParams]
    );

    const setTableRowProps = useCallback((scriptData: ScriptItems[number]) => {
      return {
        'data-script-id': scriptData.id,
      };
    }, []);

    return (
      <>
        {recordRangeLabel}
        <EuiHorizontalRule margin="xs" />
        <EuiBasicTable
          columns={columns}
          data-test-subj={dataTestSubj}
          error={error}
          items={items}
          noItemsMessage={tableLabels.table.noItemsMessage}
          loading={isLoading}
          pagination={tablePagination}
          onChange={onChange}
          rowProps={setTableRowProps}
          sorting={sorting as EuiTableSortingType<EndpointScript>}
          tableCaption={tableLabels.pageTitle}
        />
      </>
    );
  }
);

ScriptsLibraryTable.displayName = 'ScriptsLibraryTable';
