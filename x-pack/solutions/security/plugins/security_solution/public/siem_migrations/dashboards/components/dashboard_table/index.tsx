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

import { FormattedMessage } from '@kbn/i18n-react';
import {
  UtilityBar,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../common/components/utility_bar';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { SiemMigrationFilters } from '../../../../../common/siem_migrations/types';
import type { DashboardMigrationDashboard } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { useMigrationDashboardsTableColumns } from '../../hooks/use_migration_dashboards_table_columns';
import { useGetMigrationDashboards } from '../../logic/use_get_migration_dashboards';
import {
  MigrationTranslationResult,
  SiemMigrationRetryFilter,
  SiemMigrationStatus,
} from '../../../../../common/siem_migrations/constants';
import * as i18n from './translations';
import type { DashboardMigrationStats } from '../../types';
import { MigrationDashboardsFilter } from './filters';
import { convertFilterOptions } from './utils/filters';
import { EmptyMigration, SearchField } from '../../../common/components';
import type { FilterOptionsBase, MigrationSettingsBase } from '../../../common/types';
import * as logicI18n from '../../logic/translations';
import { BulkActions } from './bulk_actions';
import { useInstallMigrationDashboards } from '../../logic/use_install_migration_dashboards';
import { useGetMigrationTranslationStats } from '../../logic/use_get_migration_translation_stats';
import { useMigrationDashboardDetailsFlyout } from '../../hooks/use_migration_dashboard_details_flyout';
import { useStartDashboardsMigrationModal } from '../../hooks/use_start_dashboard_migration_modal';
import { useStartMigration } from '../../logic/use_start_migration';

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
    const { addError } = useAppToasts();

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

    const { data: translationStats, isLoading: isStatsLoading } =
      useGetMigrationTranslationStats(migrationId);

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

    const { mutateAsync: installMigrationDashboards } =
      useInstallMigrationDashboards(migrationStats);

    const { startMigration, isLoading: isRetryLoading } = useStartMigration(refetchData);
    const onStartMigrationWithSettings = useCallback(
      (settings: MigrationSettingsBase) => {
        startMigration(migrationStats, SiemMigrationRetryFilter.FAILED, settings);
      },
      [migrationStats, startMigration]
    );
    const { modal: reprocessMigrationModal, showModal: showReprocessMigrationModal } =
      useStartDashboardsMigrationModal({
        type: 'reprocess',
        migrationStats,
        translationStats,
        onStartMigrationWithSettings,
      });

    const [isTableLoading, setTableLoading] = useState(false);

    const isDashboardsLoading = isDataLoading || isTableLoading || isRetryLoading;

    const installSelectedDashboards = useCallback(async () => {
      setTableLoading(true);
      try {
        await installMigrationDashboards({
          ids: selectedMigrationDashboards.map((dashboard) => dashboard.id),
        });
      } catch (error) {
        addError(error, { title: logicI18n.INSTALL_MIGRATION_DASHBOARDS_FAILURE });
      } finally {
        setTableLoading(false);
        setSelectedMigrationDashboards([]);
      }
    }, [addError, installMigrationDashboards, selectedMigrationDashboards]);

    const installTranslatedDashboards = useCallback(async () => {
      setTableLoading(true);
      try {
        await installMigrationDashboards({});
      } catch (error) {
        addError(error, { title: logicI18n.INSTALL_MIGRATION_DASHBOARDS_FAILURE });
      } finally {
        setTableLoading(false);
      }
    }, [addError, installMigrationDashboards]);

    const installSingleDashboard = useCallback(
      async (migrationDashboard: DashboardMigrationDashboard) => {
        setTableLoading(true);
        try {
          await installMigrationDashboards({
            ids: [migrationDashboard.id],
          });
        } catch (error) {
          addError(error, { title: logicI18n.INSTALL_MIGRATION_DASHBOARDS_FAILURE });
        } finally {
          setTableLoading(false);
        }
      },
      [installMigrationDashboards, addError]
    );

    const getMigrationDashboardsData = useCallback(
      (dashboardId: string) => {
        if (!isDataLoading && migrationDashboards.length) {
          return {
            migrationDashboard: migrationDashboards.find(
              (dashboard) => dashboard.id === dashboardId
            ),
          };
        }
      },
      [isDataLoading, migrationDashboards]
    );

    const { migrationDashboardDetailsFlyout, openMigrationDashboardDetails } =
      useMigrationDashboardDetailsFlyout({
        isLoading: isDataLoading,
        getMigrationDashboardData: getMigrationDashboardsData,
      });

    const dashboardsColumns = useMigrationDashboardsTableColumns({
      shouldDisableActions: isDashboardsLoading || isTableLoading,
      installDashboard: installSingleDashboard,
      openDashboardDetailsFlyout: openMigrationDashboardDetails,
    });

    return (
      <>
        {reprocessMigrationModal}

        <EuiSkeletonLoading
          isLoading={isStatsLoading}
          loadingContent={
            <>
              <EuiSkeletonTitle />
              <EuiSkeletonText />
            </>
          }
          loadedContent={
            !translationStats?.dashboards.total ? (
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
                  <EuiFlexItem grow={false}>
                    <BulkActions
                      isTableLoading={isDashboardsLoading}
                      translationStats={translationStats}
                      selectedDashboards={selectedMigrationDashboards}
                      installTranslatedDashboards={installTranslatedDashboards}
                      installSelectedDashboards={installSelectedDashboards}
                      reprocessFailedDashboards={showReprocessMigrationModal}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <UtilityBar>
                      <UtilityBarSection>
                        <UtilityBarGroup>
                          <UtilityBarText>
                            <FormattedMessage
                              id="xpack.securitySolution.siemMigrations.dashboards.table.showingPageOfTotalLabel"
                              defaultMessage="Showing {pageIndex} - {pageSize} of {total, plural, one {# dashboard} other {# dashboards}} {pipe} Selected {selectedDashboardsAmount, plural, one {# dashboard} other {# dashboards}}"
                              values={{
                                pageIndex: pagination.pageIndex * (pagination.pageSize ?? 0) + 1,
                                pageSize: (pagination.pageIndex + 1) * (pagination.pageSize ?? 0),
                                total: pagination.totalItemCount,
                                selectedDashboardsAmount: selectedMigrationDashboards.length || 0,
                                pipe: '\u2000|\u2000',
                              }}
                            />
                          </UtilityBarText>
                        </UtilityBarGroup>
                      </UtilityBarSection>
                    </UtilityBar>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiBasicTable<DashboardMigrationDashboard>
                  tableCaption={i18n.DASHBOARDS_MIGRATION_TABLE_CAPTION}
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
        {migrationDashboardDetailsFlyout}
      </>
    );
  }
);
MigrationDashboardsTable.displayName = 'MigrationDashboardsTable';
