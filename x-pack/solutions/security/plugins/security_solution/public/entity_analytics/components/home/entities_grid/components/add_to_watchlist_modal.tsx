/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
  RIGHT_ALIGNMENT,
  type Criteria,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useMutation } from '@kbn/react-query';
import { useKibana } from '../../../../../common/lib/kibana';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { useSpaceId } from '../../../../../common/hooks/use_space_id';
import { useEntityAnalyticsRoutes } from '../../../../api/api';
import { useWatchlistFlyout } from '../../../watchlists/flyout/use_watchlist_flyout';
import { buildWatchlistsDataColumns } from '../../../watchlists/components/watchlists_management_table/columns';
import { useWatchlistsTableData } from '../../../watchlists/components/watchlists_management_table/hooks';
import type { WatchlistTableItemType } from '../../../watchlists/components/watchlists_management_table/types';

const i18nStrings = {
  title: i18n.translate('xpack.securitySolution.entityAnalytics.home.addToWatchlist.modalTitle', {
    defaultMessage: 'Select watchlist',
  }),
  cancel: i18n.translate('xpack.securitySolution.entityAnalytics.home.addToWatchlist.cancel', {
    defaultMessage: 'Cancel',
  }),
  entitiesColumn: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.addToWatchlist.entitiesColumn',
    { defaultMessage: 'Entities' }
  ),
  weightingColumn: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.addToWatchlist.weightingColumn',
    { defaultMessage: 'Risk weighting' }
  ),
  updatedColumn: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.addToWatchlist.updatedColumn',
    { defaultMessage: 'Updated' }
  ),
  select: i18n.translate('xpack.securitySolution.entityAnalytics.home.addToWatchlist.select', {
    defaultMessage: 'Select',
  }),
  createWatchlist: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.addToWatchlist.createWatchlist',
    { defaultMessage: 'Create watchlist' }
  ),
  searchPlaceholder: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.addToWatchlist.searchPlaceholder',
    { defaultMessage: 'Search by watchlist name or source' }
  ),
  refresh: i18n.translate('xpack.securitySolution.entityAnalytics.home.addToWatchlist.refresh', {
    defaultMessage: 'Refresh',
  }),
  alreadyAdded: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.addToWatchlist.alreadyAdded',
    { defaultMessage: 'Added' }
  ),
  selectNamed: (name: string) =>
    i18n.translate('xpack.securitySolution.entityAnalytics.home.addToWatchlist.selectNamed', {
      defaultMessage: 'Select {name}',
      values: { name },
    }),
  alreadyAddedNamed: (name: string) =>
    i18n.translate('xpack.securitySolution.entityAnalytics.home.addToWatchlist.alreadyAddedNamed', {
      defaultMessage: 'Added to {name}',
      values: { name },
    }),
  alreadyAddedTooltip: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.addToWatchlist.alreadyAddedTooltip',
    { defaultMessage: 'This entity is already on this watchlist' }
  ),
  noWatchlistsTitle: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.addToWatchlist.noWatchlistsTitle',
    { defaultMessage: 'No watchlists to display' }
  ),
  noWatchlistsBody: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.addToWatchlist.noWatchlistsBody',
    { defaultMessage: 'Create a watchlist or edit your search.' }
  ),
  ruleBasedHint: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.addToWatchlist.ruleBasedHint',
    {
      defaultMessage:
        'Rule-based watchlists add matching entities automatically. Entities you add here are kept, even if they do not match the rules.',
    }
  ),
  loadError: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.addToWatchlist.loadError',
    { defaultMessage: 'Unable to load watchlists' }
  ),
  updateError: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.addToWatchlist.updateError',
    { defaultMessage: 'Unable to add the entity to the watchlist' }
  ),
  errorToastTitle: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.addToWatchlist.errorToastTitle',
    { defaultMessage: 'Failed to add to watchlist' }
  ),
  successToastTitle: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.addToWatchlist.successToastTitle',
    { defaultMessage: 'Added to watchlist' }
  ),
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const SORTABLE_FIELDS = ['name', 'entityCount', 'riskModifier', 'source', 'updatedAt'] as const;
type SortField = (typeof SORTABLE_FIELDS)[number];

const compareBy = (field: SortField, direction: 'asc' | 'desc') => {
  const factor = direction === 'asc' ? 1 : -1;
  return (a: WatchlistTableItemType, b: WatchlistTableItemType) => {
    const left = a[field];
    const right = b[field];
    if (left == null && right == null) return 0;
    // Missing values go last whichever way the column is sorted.
    if (left == null) return 1;
    if (right == null) return -1;
    if (typeof left === 'string' && typeof right === 'string') {
      return left.localeCompare(right) * factor;
    }
    return (left < right ? -1 : left > right ? 1 : 0) * factor;
  };
};

/**
 * The settings table gives the name 24em; here it shares the width with five more columns, so the
 * name is cut with an ellipsis and each source goes on its own line, which keeps the table free of
 * a scrollbar and every source readable.
 */
const COLUMN_OVERRIDES: Record<string, Partial<EuiBasicTableColumn<WatchlistTableItemType>>> = {
  name: { width: '9em', truncateText: true },
  entityCount: { name: i18nStrings.entitiesColumn },
  riskModifier: { name: i18nStrings.weightingColumn },
  source: {
    width: '12em',
    render: (value: string | undefined) =>
      typeof value === 'string' && value ? (
        // Table cells are flex containers: one block keeps the sources stacked, and its minimum
        // width stops a narrow window from breaking them mid-word.
        <div style={{ minInlineSize: '11em' }}>
          {value.split(', ').map((source, index) => (
            // Two sources can share a label (every index source is "Index").
            <div key={`${source}-${index}`}>{source}</div>
          ))}
        </div>
      ) : (
        getEmptyTagValue()
      ),
  },
  updatedAt: { width: '8em', name: i18nStrings.updatedColumn },
};

/**
 * Lines the first and last cells, and the pagination row, up with the toolbar above, which has no
 * side padding.
 * This styles EUI internals (table cells, the pagination bar), which the repo discourages. EUI has
 * no prop for this padding, so it is kept on purpose for the alignment. To be re-evaluated.
 */
const TABLE_EDGES_CSS = css`
  .euiTableHeaderCell:first-of-type .euiTableCellContent,
  .euiTableRowCell:first-of-type .euiTableCellContent {
    padding-inline-start: 0;
  }
  .euiTableHeaderCell:last-of-type .euiTableCellContent,
  .euiTableRowCell:last-of-type .euiTableCellContent {
    padding-inline-end: 0;
  }
  /*
   * EUI pads the pagination bar and its "Rows per page" button. Removing the padding, instead of
   * pulling the row outwards, snaps both ends to the table edges without making it overflow.
   */
  div:has(> .eui-xScroll) {
    padding-inline: 0;
  }
  [data-test-subj='tablePaginationPopoverButton'] {
    padding-inline-start: 0;
  }
`;

export interface AddToWatchlistModalProps {
  entityId: string;
  /** Watchlists the entity is already on: they cannot be selected again. */
  assignedWatchlistIds: string[];
  onClose: () => void;
  /** Called after the entity was added, so the grid refetches. */
  onAssigned: () => void;
}

/**
 * Picks the watchlist to add one entity to, laid out like the cases "Select case" modal.
 * Adapted from the flyout's manage-watchlists modal (#282011).
 */
export const AddToWatchlistModal: React.FC<AddToWatchlistModalProps> = ({
  entityId,
  assignedWatchlistIds,
  onClose,
  onAssigned,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const {
    notifications: { toasts },
  } = useKibana().services;
  const spaceId = useSpaceId();
  const { visibleRecords, isLoading, hasError, refetch } = useWatchlistsTableData(
    spaceId ?? '',
    0,
    Boolean(spaceId)
  );
  const isTableLoading = isLoading || !spaceId;
  const { assignWatchlistEntities } = useEntityAnalyticsRoutes();
  const { openCreate, flyout } = useWatchlistFlyout(spaceId);
  const [search, setSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [sort, setSort] = useState<{ field: SortField; direction: 'asc' | 'desc' }>({
    field: 'updatedAt',
    direction: 'desc',
  });

  const mutation = useMutation({
    mutationFn: async (watchlistId: string) => {
      const response = await assignWatchlistEntities({
        watchlistId,
        body: { euids: [entityId] },
      });
      if (response.failed > 0 || response.not_found > 0) {
        throw new Error(
          response.items.find(({ error }) => error)?.error ?? i18nStrings.updateError
        );
      }
    },
    onSuccess: () => {
      onAssigned();
      toasts.addSuccess({ title: i18nStrings.successToastTitle });
      onClose();
    },
    onError: (error: Error) => {
      toasts.addError(error, { title: i18nStrings.errorToastTitle });
    },
  });

  const items = useMemo(() => {
    const term = search.trim().toLowerCase();
    return visibleRecords
      .filter(
        ({ name, source }) => !term || `${name ?? ''} ${source ?? ''}`.toLowerCase().includes(term)
      )
      .sort(compareBy(sort.field, sort.direction));
  }, [visibleRecords, search, sort]);
  const pageItems = useMemo(
    () => items.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [items, pageIndex, pageSize]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<WatchlistTableItemType>>>(
    () => [
      // Every data column is a field column; the overrides only set width, truncation and the like.
      ...buildWatchlistsDataColumns().map(
        (column) =>
          ({
            ...column,
            sortable: true,
            ...COLUMN_OVERRIDES[(column as { field: string }).field],
          } as EuiBasicTableColumn<WatchlistTableItemType>)
      ),
      {
        align: RIGHT_ALIGNMENT,
        width: '7em',
        render: ({ id, name }: WatchlistTableItemType) => {
          if (!id) return null;
          const isAlreadyAdded = assignedWatchlistIds.includes(id);
          const selectButton = (
            <EuiButton
              size="s"
              aria-label={
                isAlreadyAdded ? i18nStrings.alreadyAddedNamed(name) : i18nStrings.selectNamed(name)
              }
              iconType={isAlreadyAdded ? 'check' : undefined}
              disabled={isAlreadyAdded || mutation.isLoading}
              isLoading={mutation.isLoading && mutation.variables === id}
              onClick={() => mutation.mutate(id)}
              data-test-subj={`eaGridAddToWatchlistSelect-${id}`}
            >
              {isAlreadyAdded ? i18nStrings.alreadyAdded : i18nStrings.select}
            </EuiButton>
          );
          // Disabled buttons do not emit pointer events, so the span keeps the tooltip working.
          return isAlreadyAdded ? (
            <EuiToolTip content={i18nStrings.alreadyAddedTooltip}>
              <span tabIndex={0} role="group" aria-label={i18nStrings.alreadyAddedNamed(name)}>
                {selectButton}
              </span>
            </EuiToolTip>
          ) : (
            selectButton
          );
        },
      },
    ],
    [assignedWatchlistIds, mutation]
  );

  const onTableChange = useCallback(
    ({ sort: nextSort, page }: Criteria<WatchlistTableItemType>) => {
      if (nextSort) {
        setSort({ field: nextSort.field as SortField, direction: nextSort.direction });
      }
      if (page) {
        setPageIndex(page.index);
        setPageSize(page.size);
      }
    },
    []
  );

  // Styled like the "Create watchlist" button in the entity filters bar watchlist dropdown. The
  // toolbar one is the default size, as tall as the search box; the empty state one is small.
  const renderCreateButton = (size?: 's') => (
    <EuiButton
      size={size}
      iconType="plusCircle"
      onClick={openCreate}
      data-test-subj="eaGridAddToWatchlistCreate"
    >
      {i18nStrings.createWatchlist}
    </EuiButton>
  );

  return (
    <>
      {/* The create flyout opens in place of the modal, which returns, refreshed, once it closes. */}
      {!flyout && (
        <EuiModal
          aria-labelledby={modalTitleId}
          onClose={onClose}
          style={{ width: 1100 }}
          data-test-subj="eaGridAddToWatchlistModal"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id={modalTitleId}>{i18nStrings.title}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>{renderCreateButton()}</EuiFlexItem>
              <EuiFlexItem>
                <EuiFieldSearch
                  fullWidth
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPageIndex(0);
                  }}
                  placeholder={i18nStrings.searchPlaceholder}
                  aria-label={i18nStrings.searchPlaceholder}
                  data-test-subj="eaGridAddToWatchlistSearch"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="refresh"
                  aria-label={i18nStrings.refresh}
                  onClick={() => refetch()}
                  isLoading={isTableLoading}
                  data-test-subj="eaGridAddToWatchlistRefresh"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            {!hasError && !isTableLoading && visibleRecords.length > 0 && (
              <>
                <EuiSpacer size="s" />
                <EuiFlexGroup
                  gutterSize="xs"
                  alignItems="flexStart"
                  responsive={false}
                  data-test-subj="eaGridAddToWatchlistHint"
                >
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="info" size="s" color="subdued" aria-hidden />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued">
                      {i18nStrings.ruleBasedHint}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            )}
            <EuiSpacer size="s" />
            {hasError ? (
              <KbnDangerCallout
                announceOnMount
                size="s"
                title={i18nStrings.loadError}
                data-test-subj="eaGridAddToWatchlistLoadError"
              />
            ) : (
              <>
                {!isTableLoading && (
                  <EuiText size="xs" color="subdued" data-test-subj="eaGridAddToWatchlistShowing">
                    {i18n.translate(
                      'xpack.securitySolution.entityAnalytics.home.addToWatchlist.showing',
                      {
                        defaultMessage:
                          'Showing {shown} of {total} {total, plural, =1 {watchlist} other {watchlists}}',
                        values: { shown: pageItems.length, total: items.length },
                      }
                    )}
                  </EuiText>
                )}
                <EuiSpacer size="s" />
                <EuiBasicTable<WatchlistTableItemType>
                  tableCaption={i18nStrings.title}
                  items={pageItems}
                  columns={columns}
                  loading={isTableLoading}
                  pagination={{
                    pageIndex,
                    pageSize,
                    totalItemCount: items.length,
                    pageSizeOptions: PAGE_SIZE_OPTIONS,
                  }}
                  sorting={{ sort }}
                  onChange={onTableChange}
                  tableLayout="auto"
                  responsiveBreakpoint={false}
                  css={TABLE_EDGES_CSS}
                  noItemsMessage={
                    isTableLoading ? null : (
                      <EuiEmptyPrompt
                        titleSize="xs"
                        title={<h3>{i18nStrings.noWatchlistsTitle}</h3>}
                        body={i18nStrings.noWatchlistsBody}
                        actions={renderCreateButton('s')}
                        data-test-subj="eaGridAddToWatchlistEmpty"
                      />
                    )
                  }
                  data-test-subj="eaGridAddToWatchlistTable"
                />
              </>
            )}
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={onClose} disabled={mutation.isLoading}>
              {i18nStrings.cancel}
            </EuiButtonEmpty>
          </EuiModalFooter>
        </EuiModal>
      )}
      {flyout}
    </>
  );
};
