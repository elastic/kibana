/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { CriteriaWithPagination, EuiTableSelectionType } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonLoading,
  EuiSkeletonText,
  EuiSkeletonTitle,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  MigrationTranslationResult,
  SiemMigrationStatus,
} from '../../../../../common/siem_migrations/constants';
import type { SiemMigrationFilters } from '../../../../../common/siem_migrations/types';
import type { WorkflowMigrationWorkflow } from '../../../../../common/siem_migrations/model/workflow_migration.gen';
import {
  UtilityBar,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../common/components/utility_bar';
import { EmptyMigration, MemoizedBasicTable, SearchField } from '../../../common/components';
import type { FilterOptionsBase } from '../../../common/types';
import { useGetMigrationTranslationStats } from '../../service/hooks/use_get_migration_translation_stats';
import { useGetMigrationWorkflows } from '../../service/hooks/use_get_migration_workflows';
import type { WorkflowMigrationStats } from '../../types';
import { useFlyoutPrevNextNav } from '../../../../common/flyout_prev_next_nav';
import { isMigrationItemNavigableWithFlyout } from '../../../common/utils';
import { WorkflowMigrationDetailsFlyout } from '../workflow_details_flyout';
import { getWorkflowsTableColumns } from './columns';
import { convertFilterOptions } from './convert_filter_options';
import { MigrationWorkflowsFilter } from './filters';
import * as i18n from './translations';

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT_FIELD = 'translation_result';
const DEFAULT_SORT_DIRECTION = 'desc';

// The "Translated on" column shows `updated_at`, the server names the matching sort `updated`
const SORT_FIELDS: Record<string, string> = { updated_at: 'updated' };

export interface MigrationWorkflowsTableProps {
  migrationStats: WorkflowMigrationStats;
}

/** Table with the translation results of a workflow migration, filtered, sorted and paged on the server */
export const MigrationWorkflowsTable = React.memo<MigrationWorkflowsTableProps>(
  ({ migrationStats }) => {
    const migrationId = migrationStats.id;

    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [sortField, setSortField] = useState<string>(DEFAULT_SORT_FIELD);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIRECTION);
    const [searchTerm, setSearchTerm] = useState<string | undefined>();
    const [filterOptions, setFilterOptions] = useState<FilterOptionsBase | undefined>();

    const filters = useMemo<SiemMigrationFilters>(
      () => ({ searchTerm, ...convertFilterOptions(filterOptions) }),
      [searchTerm, filterOptions]
    );

    const { data: translationStats, isLoading: isStatsLoading } =
      useGetMigrationTranslationStats(migrationId);

    const {
      data: { migrationWorkflows, total } = { migrationWorkflows: [], total: 0 },
      isLoading,
    } = useGetMigrationWorkflows({
      migrationId,
      page: pageIndex,
      perPage: pageSize,
      sortField: SORT_FIELDS[sortField] ?? sortField,
      sortDirection,
      filters,
    });

    const [openedWorkflowId, setOpenedWorkflowId] = useState<string | undefined>();
    const openWorkflowDetailsFlyout = useCallback(
      (workflow: WorkflowMigrationWorkflow) => setOpenedWorkflowId(workflow.id),
      []
    );
    const closeWorkflowDetailsFlyout = useCallback(() => setOpenedWorkflowId(undefined), []);
    // previous and next walk through the loaded page and skip the workflows without details
    const navigation = useFlyoutPrevNextNav({
      items: migrationWorkflows,
      openedItemId: openedWorkflowId,
      isNavigable: isMigrationItemNavigableWithFlyout,
      onNavigate: openWorkflowDetailsFlyout,
    });
    // the details are shown only while the workflow is part of the loaded page
    const openedWorkflow = useMemo(
      () => migrationWorkflows.find((workflow) => workflow.id === openedWorkflowId),
      [migrationWorkflows, openedWorkflowId]
    );

    const columns = useMemo(
      () => getWorkflowsTableColumns({ openWorkflowDetailsFlyout }),
      [openWorkflowDetailsFlyout]
    );

    const [selectedWorkflows, setSelectedWorkflows] = useState<WorkflowMigrationWorkflow[]>([]);
    const tableSelection = useMemo<EuiTableSelectionType<WorkflowMigrationWorkflow>>(
      () => ({
        selectable: (item) =>
          !item.elastic_workflow?.id &&
          item.status !== SiemMigrationStatus.FAILED &&
          item.translation_result !== MigrationTranslationResult.UNTRANSLATABLE,
        selectableMessage: (selectable, item) => {
          if (selectable) {
            return '';
          }
          return item.elastic_workflow?.id
            ? i18n.ALREADY_INSTALLED_WORKFLOW_TOOLTIP
            : i18n.NOT_TRANSLATED_WORKFLOW_TOOLTIP;
        },
        onSelectionChange: setSelectedWorkflows,
        selected: selectedWorkflows,
      }),
      [selectedWorkflows]
    );

    const pagination = useMemo(
      () => ({ pageIndex, pageSize, totalItemCount: total }),
      [pageIndex, pageSize, total]
    );

    const sorting = useMemo(
      () => ({
        sort: { field: sortField as keyof WorkflowMigrationWorkflow, direction: sortDirection },
      }),
      [sortField, sortDirection]
    );

    const onTableChange = useCallback(
      ({ page, sort }: CriteriaWithPagination<WorkflowMigrationWorkflow>) => {
        if (page) {
          setPageIndex(page.index);
          setPageSize(page.size);
        }
        if (sort) {
          setSortField(sort.field as string);
          setSortDirection(sort.direction);
        }
      },
      []
    );

    const onSearch = useCallback((value: string) => {
      setSearchTerm(value.trim());
      setPageIndex(0);
    }, []);

    const onFilterOptionsChanged = useCallback((options?: FilterOptionsBase) => {
      setFilterOptions(options);
      setPageIndex(0);
    }, []);

    return (
      <EuiSkeletonLoading
        isLoading={isStatsLoading}
        loadingContent={
          <>
            <EuiSkeletonTitle />
            <EuiSkeletonText />
          </>
        }
        loadedContent={
          !translationStats?.items.total ? (
            <EmptyMigration />
          ) : (
            <div data-test-subj="siemMigrationsWorkflowsTable">
              <EuiFlexGroup gutterSize="m" justifyContent="flexEnd" wrap>
                <EuiFlexItem>
                  <SearchField
                    initialValue={searchTerm}
                    onSearch={onSearch}
                    placeholder={i18n.SEARCH_PLACEHOLDER}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <MigrationWorkflowsFilter
                    filterOptions={filterOptions}
                    onFilterOptionsChanged={onFilterOptionsChanged}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              <UtilityBar>
                <UtilityBarSection>
                  <UtilityBarGroup>
                    <UtilityBarText>
                      <span data-test-subj="workflowsTableSummary">
                        <FormattedMessage
                          id="xpack.securitySolution.siemMigrations.workflows.table.showingPageOfTotalLabel"
                          defaultMessage="Showing {from} - {to} of {total, plural, one {# workflow} other {# workflows}} {pipe} Selected {selected, plural, one {# workflow} other {# workflows}}"
                          values={{
                            from: total === 0 ? 0 : pageIndex * pageSize + 1,
                            to: Math.min((pageIndex + 1) * pageSize, total),
                            total,
                            selected: selectedWorkflows.length,
                            pipe: '\u2000|\u2000',
                          }}
                        />
                      </span>
                    </UtilityBarText>
                  </UtilityBarGroup>
                </UtilityBarSection>
              </UtilityBar>
              <EuiSpacer size="m" />
              <MemoizedBasicTable<WorkflowMigrationWorkflow>
                tableCaption={i18n.WORKFLOWS_MIGRATION_TABLE_CAPTION}
                loading={isLoading}
                items={migrationWorkflows}
                pagination={pagination}
                sorting={sorting}
                onChange={onTableChange}
                selection={tableSelection}
                itemId="id"
                data-test-subj="workflows-translation-table"
                columns={columns}
              />
              {openedWorkflow && (
                <WorkflowMigrationDetailsFlyout
                  migrationWorkflow={openedWorkflow}
                  closeFlyout={closeWorkflowDetailsFlyout}
                  navigation={navigation}
                />
              )}
            </div>
          )
        }
      />
    );
  }
);
MigrationWorkflowsTable.displayName = 'MigrationWorkflowsTable';
