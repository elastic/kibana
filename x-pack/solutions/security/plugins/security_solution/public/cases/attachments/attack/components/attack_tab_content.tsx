/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  EuiDataGridColumnSortingConfig,
  EuiDataGridSorting,
  EuiDataGridStyle,
  EuiDataGridToolBarVisibilityOptions,
} from '@elastic/eui';
import { EuiDataGrid, EuiEmptyPrompt, EuiFlexItem, EuiProgress } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { CommonAttachmentListViewProps } from '@kbn/cases-plugin/public';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import {
  ATTACK_TAB_EMPTY_TEST_ID,
  ATTACK_TAB_GRID_TEST_ID,
  ATTACK_TAB_TABLE_TEST_ID,
} from '../../../../../common/cases/attachments/attack/test_ids';
import { useKibana } from '../../../../common/lib/kibana';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import { useFindAttackDiscoveries } from '../../../../attack_discovery/pages/use_find_attack_discoveries';
import { useInvestigateAttackInTimeline } from '../hooks/use_investigate_attack_in_timeline';
import type { SelectedAttack } from './attack_tab_bulk_actions';
import { AttackTabBulkActions } from './attack_tab_bulk_actions';
import type { AttackCaseAttachmentRow } from '../utils';
import {
  ATTACK_CASE_ATTACHMENT_COLUMNS_LOCAL_STORAGE_KEY,
  isAttackAttachment,
  matchesSearchTerm,
  toVisibleAttackTabColumnIds,
} from '../utils';
import { GRID_COLUMNS } from './attack_tab_columns';
import type { AttackGridCellContextValue } from './attack_tab_cell_context';
import { AttackGridCellContext } from './attack_tab_cell_context';
import { AttackGridCell, LEADING_CONTROL_COLUMNS } from './attack_tab_cells';
import type { AttackRow } from './attack_tab_row';
import { getAttachedBy, getTitle } from './attack_tab_row';
import { compareRows, DEFAULT_SORTING } from './attack_tab_sorting';

/** Matches the alerts grid. */
const GRID_STYLE: EuiDataGridStyle = {
  border: 'none',
  fontSize: 's',
  header: 'underline',
};

/** Matches the alerts grid; the bulk action bar is appended at render time. */
const TOOLBAR_VISIBILITY: EuiDataGridToolBarVisibilityOptions = {
  showColumnSelector: true,
  showSortSelector: true,
  showDisplaySelector: false,
  showFullScreenSelector: false,
};

const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/** Shared so clearing the selection never re-renders a grid that already has none. */
const NO_SELECTION: ReadonlySet<string> = new Set();

const TABLE_CAPTION = i18n.translate('xpack.securitySolution.attackDiscovery.cases.tab.caption', {
  defaultMessage: 'Attacks attached to this case',
});

/**
 * Renders the "Attacks" section of the case Attachments tab, filtering by `searchTerm` against
 * the snapshot before querying so a search that matches nothing costs no request.
 */
export const AttackTabContent: React.FC<CommonAttachmentListViewProps> = ({
  caseData,
  searchTerm,
  onRemove,
}) => {
  const attachments = useMemo<AttackCaseAttachmentRow[]>(
    () =>
      caseData.comments.flatMap((comment) =>
        isAttackAttachment(comment) && (!searchTerm || matchesSearchTerm(comment, searchTerm))
          ? [comment]
          : []
      ),
    [caseData.comments, searchTerm]
  );

  if (attachments.length === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj={ATTACK_TAB_EMPTY_TEST_ID}
        iconType="securitySignalDetected"
        iconColor="default"
        titleSize="xs"
        body={
          <p>
            {searchTerm ? (
              <FormattedMessage
                id="xpack.securitySolution.attackDiscovery.cases.tab.noResults"
                defaultMessage="No attacks match your search."
              />
            ) : (
              <FormattedMessage
                id="xpack.securitySolution.attackDiscovery.cases.tab.empty"
                defaultMessage="No attacks have been attached to this case yet."
              />
            )}
          </p>
        }
      />
    );
  }

  return <AttackTabTable attachments={attachments} searchTerm={searchTerm} onRemove={onRemove} />;
};

AttackTabContent.displayName = 'AttackTabContent';

/** Split out so the attacks query never fires on a case with no attack attachments. */
const AttackTabTable = ({
  attachments,
  searchTerm,
  onRemove,
}: {
  attachments: AttackCaseAttachmentRow[];
  searchTerm: CommonAttachmentListViewProps['searchTerm'];
  onRemove: CommonAttachmentListViewProps['onRemove'];
}) => {
  const { http, storage } = useKibana().services;
  const { isAssistantEnabled } = useAssistantAvailability();
  const { canInvestigateInTimeline, investigateAttackInTimeline } =
    useInvestigateAttackInTimeline();

  // Memoized because the array is part of the react-query key.
  const attackIds = useMemo(
    () => attachments.map(({ attachmentId }) => attachmentId),
    [attachments]
  );

  const { data, isLoading } = useFindAttackDiscoveries({
    http,
    ids: attackIds,
    // Attacks attached by a teammate belong to the case regardless of who generated them.
    includeAllAuthors: true,
    // `_find` defaults to 10 per page, which would silently truncate the section.
    perPage: Math.max(attackIds.length, 1),
    // The hook has no separate `enabled` flag; this doubles as one.
    isAssistantEnabled,
  });

  const attacksById = useMemo(
    () =>
      (data?.data ?? []).reduce<Record<string, AttackDiscoveryAlert>>((acc, attack) => {
        acc[attack.id] = attack;
        return acc;
      }, {}),
    [data?.data]
  );

  // react-query v4 reports a disabled query as loading forever, so the assistant flag decides
  // whether a fetch is really in flight.
  const isFetchingAttacks = isAssistantEnabled && isLoading;

  // A row `_find` did not return still renders from its snapshot; the attack may be deleted or
  // just not visible to this user.
  const hasSettled = !isFetchingAttacks;

  const items = useMemo<AttackRow[]>(
    () =>
      attachments.map((attachment) => {
        const attack = attacksById[attachment.attachmentId];
        return {
          attachmentId: attachment.attachmentId,
          savedObjectId: attachment.id,
          metadata: attachment.metadata,
          createdAt: attachment.createdAt,
          attachedBy: getAttachedBy(attachment.createdBy),
          attack,
          isUnresolved: hasSettled && attack == null,
        };
      }),
    [attachments, attacksById, hasSettled]
  );

  const [sortingColumns, setSortingColumns] =
    useState<EuiDataGridColumnSortingConfig[]>(DEFAULT_SORTING);

  const sorting = useMemo<EuiDataGridSorting>(
    () => ({ columns: sortingColumns, onSort: setSortingColumns }),
    [sortingColumns]
  );

  const rows = useMemo(
    () => [...items].sort((a, b) => compareRows(a, b, sortingColumns)),
    [items, sortingColumns]
  );

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    toVisibleAttackTabColumnIds(storage.get(ATTACK_CASE_ATTACHMENT_COLUMNS_LOCAL_STORAGE_KEY))
  );

  const onChangeVisibleColumns = useCallback(
    (nextVisibleColumns: string[]) => {
      storage.set(ATTACK_CASE_ATTACHMENT_COLUMNS_LOCAL_STORAGE_KEY, nextVisibleColumns);
      setVisibleColumns(nextVisibleColumns);
    },
    [storage]
  );

  const columnVisibility = useMemo(
    () => ({ visibleColumns, setVisibleColumns: onChangeVisibleColumns }),
    [onChangeVisibleColumns, visibleColumns]
  );

  const [selectedRowIds, setSelectedRowIds] = useState<ReadonlySet<string>>(NO_SELECTION);

  const clearSelection = useCallback(() => setSelectedRowIds(NO_SELECTION), []);

  // A row filtered out by the search must not stay in a bulk action the user cannot see.
  useEffect(() => {
    clearSelection();
  }, [clearSelection, searchTerm]);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const onChangeItemsPerPage = useCallback(
    (nextPageSize: number) => {
      setPageSize(nextPageSize);
      setPageIndex(0);
      // The old selection no longer matches the rows on screen.
      clearSelection();
    },
    [clearSelection]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      onChangeItemsPerPage,
      onChangePage: setPageIndex,
    }),
    [onChangeItemsPerPage, pageIndex, pageSize]
  );

  const toggleRowSelected = useCallback((savedObjectId: string) => {
    setSelectedRowIds((current) => {
      const next = new Set(current);
      if (!next.delete(savedObjectId)) {
        next.add(savedObjectId);
      }
      return next;
    });
  }, []);

  // Every bulk action reads the live document, so unresolved and still-loading rows are excluded.
  const selectableRows = useMemo(() => rows.filter(({ attack }) => attack != null), [rows]);

  // Derived from the selectable rows so a row that is removed or stops resolving drops out.
  const selectedRows = useMemo(
    () => selectableRows.filter(({ savedObjectId }) => selectedRowIds.has(savedObjectId)),
    [selectableRows, selectedRowIds]
  );

  const selectedRowCount = selectedRows.length;

  const areAllRowsSelected =
    selectableRows.length > 0 && selectedRowCount === selectableRows.length;

  const toggleAllRowsSelected = useCallback(() => {
    // Selects across every page, not just the visible one.
    setSelectedRowIds(
      areAllRowsSelected
        ? NO_SELECTION
        : new Set(selectableRows.map(({ savedObjectId }) => savedObjectId))
    );
  }, [areAllRowsSelected, selectableRows]);

  const onRemoveAttack = useMemo(
    () =>
      onRemove != null ? (attackId: string) => onRemove({ attachmentIds: [attackId] }) : undefined,
    [onRemove]
  );

  const onRemoveSelected = useMemo(
    () =>
      onRemove != null
        ? (selectedAttackIds: string[]) =>
            onRemove({ attachmentIds: selectedAttackIds }, { onSuccess: clearSelection })
        : undefined,
    [clearSelection, onRemove]
  );

  const cellContext = useMemo<AttackGridCellContextValue>(
    () => ({
      areAllRowsSelected,
      canInvestigateInTimeline,
      investigateAttackInTimeline,
      onRemoveAttack,
      rows,
      selectableRowCount: selectableRows.length,
      selectedRowCount,
      selectedRowIds,
      toggleAllRowsSelected,
      toggleRowSelected,
    }),
    [
      areAllRowsSelected,
      canInvestigateInTimeline,
      investigateAttackInTimeline,
      onRemoveAttack,
      rows,
      selectableRows.length,
      selectedRowCount,
      selectedRowIds,
      toggleAllRowsSelected,
      toggleRowSelected,
    ]
  );

  const selectedAttacks = useMemo<SelectedAttack[]>(
    () =>
      selectedRows.map(({ attachmentId, attack, metadata }) => ({
        attackId: attachmentId,
        title: getTitle(attack, metadata),
        attack,
      })),
    [selectedRows]
  );

  const toolbarVisibility = useMemo<EuiDataGridToolBarVisibilityOptions>(
    () => ({
      ...TOOLBAR_VISIBILITY,
      additionalControls: {
        left: {
          append: (
            <AttackTabBulkActions
              areAllAttacksSelected={areAllRowsSelected}
              onActionSuccess={clearSelection}
              onRemove={onRemoveSelected}
              onToggleSelectAll={toggleAllRowsSelected}
              selectedAttacks={selectedAttacks}
              totalAttacks={selectableRows.length}
            />
          ),
        },
      },
    }),
    [
      areAllRowsSelected,
      clearSelection,
      onRemoveSelected,
      selectableRows.length,
      selectedAttacks,
      toggleAllRowsSelected,
    ]
  );

  return (
    <EuiFlexItem
      data-test-subj={ATTACK_TAB_TABLE_TEST_ID}
      css={css`
        position: relative;
      `}
    >
      {isFetchingAttacks ? <EuiProgress color="accent" position="absolute" size="xs" /> : null}
      <AttackGridCellContext.Provider value={cellContext}>
        <EuiDataGrid
          aria-label={TABLE_CAPTION}
          columns={GRID_COLUMNS}
          columnVisibility={columnVisibility}
          data-test-subj={ATTACK_TAB_GRID_TEST_ID}
          gridStyle={GRID_STYLE}
          leadingControlColumns={LEADING_CONTROL_COLUMNS}
          pagination={pagination}
          renderCellValue={AttackGridCell}
          rowCount={rows.length}
          sorting={sorting}
          toolbarVisibility={toolbarVisibility}
        />
      </AttackGridCellContext.Provider>
    </EuiFlexItem>
  );
};

AttackTabTable.displayName = 'AttackTabTable';

// eslint-disable-next-line import/no-default-export
export default AttackTabContent;
