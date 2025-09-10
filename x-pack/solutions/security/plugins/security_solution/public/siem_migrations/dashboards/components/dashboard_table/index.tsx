/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination, EuiTableSelectionType } from '@elastic/eui';
import {
  EuiSkeletonLoading,
  EuiSkeletonTitle,
  EuiSkeletonText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiBasicTable,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import type { SiemMigrationFilters } from '../../../../../common/siem_migrations/types';
import type { DashboardMigrationDashboard } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { useMigrationDashboardsTableColumns } from '../../hooks/use_migration_dashboards_table_columns';
import { useGetMigrationDashboards } from '../../logic/use_get_migration_dashboards';
import {
  MigrationTranslationResult,
  SiemMigrationStatus,
} from '../../../../../common/siem_migrations/constants';
import * as i18n from './translations';
import type { DashboardMigrationStats } from '../../types';
import { MigrationDashboardsFilter } from './filters';
import { convertFilterOptions } from './utils/filters';
import { EmptyMigration, SearchField } from '../../../common/components';
import type { FilterOptionsBase } from '../../../common/types';

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT_FIELD = 'translation_result';
const DEFAULT_SORT_DIRECTION = 'desc';

export interface MigrationDashboardsTableProps {
  /**
   * Re-fetches latest dashboards migration data
   */
  refetchData?: () => void;

  /**
   * Migration stats
   */
  migrationStats: DashboardMigrationStats;
}

/**
 * Table Component for displaying SIEM dashboards migrations
 */
export const MigrationDashboardsTable: React.FC<MigrationDashboardsTableProps> = React.memo(
  ({ refetchData, migrationStats }) => {
    const migrationId = migrationStats.id;

    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [sortField, setSortField] =
      useState<keyof DashboardMigrationDashboard>(DEFAULT_SORT_FIELD);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIRECTION);
    const [searchTerm, setSearchTerm] = useState<string | undefined>();

    // Filters
    const [filterOptions, setFilterOptions] = useState<FilterOptionsBase | undefined>();

    const filters = useMemo<SiemMigrationFilters>(
      () => ({ searchTerm, ...convertFilterOptions(filterOptions) }),
      [searchTerm, filterOptions]
    );

    const {
      data: { migrationDashboards, total } = { migrationDashboards: [], total: 0 },
      isLoading: isDataLoading,
    } = useGetMigrationDashboards({
      migrationId,
      page: pageIndex,
      perPage: pageSize,
      sortField,
      sortDirection,
      filters,
    });

    const [selectedMigrationDashboards, setSelectedMigrationDashboards] = useState<
      DashboardMigrationDashboard[]
    >([]);
    const tableSelection: EuiTableSelectionType<DashboardMigrationDashboard> = useMemo(
      () => ({
        selectable: (item: DashboardMigrationDashboard) => {
          return (
            !item.elastic_dashboard?.id &&
            item.status !== SiemMigrationStatus.FAILED &&
            item.translation_result !== MigrationTranslationResult.UNTRANSLATABLE
          );
        },
        selectableMessage: (selectable: boolean, item: DashboardMigrationDashboard) => {
          if (selectable) {
            return '';
          }
          return item.elastic_dashboard?.id
            ? i18n.ALREADY_INSTALLED_DASHBOARD_TOOLTIP
            : i18n.NOT_TRANSLATED_DASHBOARD_TOOLTIP;
        },
        onSelectionChange: setSelectedMigrationDashboards,
        selected: selectedMigrationDashboards,
      }),
      [selectedMigrationDashboards]
    );

    const pagination = useMemo(() => {
      return {
        pageIndex,
        pageSize,
        totalItemCount: total,
      };
    }, [pageIndex, pageSize, total]);

    const sorting = useMemo(() => {
      return {
        sort: {
          field: sortField,
          direction: sortDirection,
        },
      };
    }, [sortDirection, sortField]);

    const onTableChange = useCallback(
      ({ page, sort }: CriteriaWithPagination<DashboardMigrationDashboard>) => {
        if (page) {
          setPageIndex(page.index);
          setPageSize(page.size);
        }
        if (sort) {
          const { field, direction } = sort;
          setSortField(field);
          setSortDirection(direction);
        }
      },
      []
    );

    const handleOnSearch = useCallback((value: string) => {
      setSearchTerm(value.trim());
    }, []);

    const dashboardsColumns = useMigrationDashboardsTableColumns();

    return (
      <>
        <EuiSkeletonLoading
          isLoading={isDataLoading}
          loadingContent={
            <>
              <EuiSkeletonTitle />
              <EuiSkeletonText />
            </>
          }
          loadedContent={
            !total ? (
              <EmptyMigration />
            ) : (
              <>
                <EuiFlexGroup
                  data-test-subj="siemMigrationsDashboardsTable"
                  gutterSize="m"
                  justifyContent="flexEnd"
                  wrap
                >
                  <EuiFlexItem>
                    <SearchField initialValue={searchTerm} onSearch={handleOnSearch} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <MigrationDashboardsFilter
                      filterOptions={filterOptions}
                      onFilterOptionsChanged={setFilterOptions}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiBasicTable<DashboardMigrationDashboard>
                  loading={false}
                  items={migrationDashboards}
                  pagination={pagination}
                  sorting={sorting}
                  onChange={onTableChange}
                  selection={tableSelection}
                  itemId={'id'}
                  data-test-subj={'dashboards-translation-table'}
                  columns={dashboardsColumns}
                />
              </>
            )
          }
        />
      </>
    );
  }
);
MigrationDashboardsTable.displayName = 'MigrationDashboardsTable';
