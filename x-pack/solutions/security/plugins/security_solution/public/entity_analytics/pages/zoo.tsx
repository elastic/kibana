/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import moment from 'moment';
import {
  EuiDataGrid,
  EuiDataGridColumn,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import { Global, css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import { useQuery } from '@kbn/react-query';
import { SecurityPageName } from '../../app/types';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SiemSearchBar } from '../../common/components/search_bar';
import { InputsModelId } from '../../common/store/inputs/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { useKibana } from '../../common/lib/kibana';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { useEntityStoreDataView } from '../components/home/use_entity_store_data_view';
import { ENTITY_GRID_INTERNAL_URL } from '../../../common/entity_analytics/entity_analytics/constants';

const PAGE_TITLE = i18n.translate('xpack.securitySolution.entityAnalytics.zoo.pageTitle', {
  defaultMessage: 'Entity analytics (ES|QL)',
});

const MANAGEMENT_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.zoo.managementLink',
  { defaultMessage: 'Management' }
);

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const GRID_COLUMNS: EuiDataGridColumn[] = [
  { id: 'entity.id', displayAsText: 'Entity ID', initialWidth: 320 },
  { id: 'entity.name', displayAsText: 'Name', initialWidth: 200 },
  { id: 'entity.EngineMetadata.Type', displayAsText: 'Type', initialWidth: 100 },
  { id: 'entity.risk.calculated_score_norm', displayAsText: 'Risk score', initialWidth: 120 },
  { id: 'asset.criticality', displayAsText: 'Asset criticality', initialWidth: 160 },
  { id: '@timestamp', displayAsText: 'Last seen', initialWidth: 200 },
  { id: 'last_seen_alert', displayAsText: 'Last seen alert', initialWidth: 200 },
  { id: 'risk_score_change', displayAsText: 'Score Δ (1d)', initialWidth: 120 },
];

interface EntityGridResponse {
  entities: Array<Record<string, unknown>>;
  next_cursor: string | null;
  total: number;
}

const pageWrapperOverride = css`
  [data-test-subj='pageContainer'].securityPageWrapper { padding-inline: 0 !important; }
  [data-test-subj='pageContainer'].securityPageWrapper > [class*='euiPageSection__content'] {
    padding-block: 0 !important;
  }
`;

const useEntityGridData = ({
  sortField,
  sortDirection,
  pageIndex,
  pageSize,
  cursors,
  onNextCursor,
}: {
  sortField: string;
  sortDirection: 'asc' | 'desc';
  pageIndex: number;
  pageSize: number;
  cursors: Array<string | null>;
  onNextCursor: (pageIndex: number, cursor: string) => void;
}) => {
  const { http } = useKibana().services;
  const cursor = cursors[pageIndex] ?? null;
  // Keep the last known total so rowCount never collapses to 0 during page transitions.
  const [cachedTotal, setCachedTotal] = useState(0);

  const { data, isFetching } = useQuery(
    ['entity-zoo-grid', sortField, sortDirection, pageIndex, pageSize, cursor],
    async () => {
      const result = await http.post<EntityGridResponse>(ENTITY_GRID_INTERNAL_URL, {
        version: '1',
        body: JSON.stringify({
          sort: { field: sortField, direction: sortDirection },
          page_size: pageSize,
          ...(cursor ? { cursor } : {}),
        }),
      });
      return result;
    },
    {
      onSuccess: (result) => {
        setCachedTotal(result.total);
        if (result.next_cursor && !cursors[pageIndex + 1]) {
          onNextCursor(pageIndex + 1, result.next_cursor);
        }
      },
    }
  );

  return {
    rows: data?.entities ?? [],
    total: cachedTotal,
    isFetching,
  };
};

export const EntityAnalyticsZooPage: React.FC = () => {
  const spaceId = useSpaceId();
  const { dataView, isLoading: isDataViewLoading } = useEntityStoreDataView(spaceId);
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const { euiTheme } = useEuiTheme();

  const [sortField, setSortField] = useState('entity.risk.calculated_score_norm');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  // cursors[i] is the cursor to pass when loading page i; cursors[0] is always null (first page)
  const [cursors, setCursors] = useState<Array<string | null>>([null]);

  const resetPagination = useCallback(() => {
    setPageIndex(0);
    setCursors([null]);
  }, []);

  const onNextCursor = useCallback((idx: number, cursor: string) => {
    setCursors((prev) => {
      const next = [...prev];
      next[idx] = cursor;
      return next;
    });
  }, []);

  const { rows, total, isFetching } = useEntityGridData({
    sortField,
    sortDirection,
    pageIndex,
    pageSize,
    cursors,
    onNextCursor,
  });

  const [visibleColumns, setVisibleColumns] = useState(GRID_COLUMNS.map((c) => c.id));

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      const relativeIndex = rowIndex - pageIndex * pageSize;
      const value = rows[relativeIndex]?.[columnId];
      if (value == null) return <>—</>;
      if (columnId === 'last_seen_alert' || columnId === '@timestamp') {
        const m = moment(value as string);
        return <>{m.isValid() ? m.fromNow() : String(value)}</>;
      }
      if (columnId === 'risk_score_change') {
        const delta = value as number;
        if (delta > 0)
          return <EuiTextColor color="danger">↑ +{delta.toFixed(1)}</EuiTextColor>;
        if (delta < 0)
          return <EuiTextColor color="success">↓ {delta.toFixed(1)}</EuiTextColor>;
        return <>→ 0.0</>;
      }
      return <>{String(value)}</>;
    },
    [rows, pageIndex, pageSize]
  );

  const sorting = useMemo(
    () => ({
      columns: [{ id: sortField, direction: sortDirection }],
      onSort: (cols: Array<{ id: string; direction: 'asc' | 'desc' }>) => {
        // EuiDataGrid appends new columns when clicking an unsorted header;
        // pick the newly added column (id ≠ current sortField), falling back
        // to cols[0] when the user is toggling direction on the existing sort.
        const col = cols.find((c) => c.id !== sortField) ?? cols[0];
        if (!col) return;
        setSortField(col.id);
        setSortDirection(col.direction);
        resetPagination();
      },
    }),
    [sortField, sortDirection, resetPagination]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      onChangePage: (newPage: number) => setPageIndex(newPage),
      onChangeItemsPerPage: (newSize: number) => {
        setPageSize(newSize);
        resetPagination();
      },
    }),
    [pageIndex, pageSize, resetPagination]
  );

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      items: [
        {
          id: 'entityAnalyticsManagement',
          label: MANAGEMENT_LABEL,
          iconType: 'gear' as const,
          href: getSecuritySolutionUrl({ deepLinkId: SecurityPageName.entityAnalyticsManagement }),
        },
      ],
    }),
    [getSecuritySolutionUrl]
  );

  if (isDataViewLoading) return <EuiLoadingSpinner size="l" />;

  return (
    <>
      <Global styles={pageWrapperOverride} />
      <AppHeader title={PAGE_TITLE} menu={menu} />
      <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsZooPage">
        <div
          css={css`
            padding-block-start: ${euiTheme.size.base};
            display: flex;
            flex-direction: column;
            height: 100%;
          `}
        >
          <div css={css`padding-inline: ${euiTheme.size.base};`}>
            <SiemSearchBar dataView={dataView} id={InputsModelId.global} hideDatePicker />
          </div>

          <EuiSpacer size="m" />

          <EuiDataGrid
            aria-label="Entity analytics ES|QL grid"
            columns={GRID_COLUMNS}
            columnVisibility={{ visibleColumns, setVisibleColumns }}
            rowCount={total}
            renderCellValue={renderCellValue}
            sorting={sorting}
            pagination={pagination}
            loading={isFetching}
          />
        </div>
      </SecuritySolutionPageWrapper>
      <SpyRoute pageName={SecurityPageName.entityAnalyticsHomePage} />
    </>
  );
};
