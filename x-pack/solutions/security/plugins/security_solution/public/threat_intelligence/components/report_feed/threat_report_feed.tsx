/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPagination,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { SeverityLevel, ThreatCategory } from '../../../../common/threat_intelligence/hub';
import { ReportFeedFilterRow } from './report_feed_filter_row';
import { ReportFeedGrid } from './report_feed_grid';
import type { ReportFeedSort } from './constants';
import type { ThreatReportFeedItem } from './types';
import { countCategoriesFromItems, countSeverities, filterAndSortFeedItems } from './utils';

export interface ThreatReportFeedPagination {
  pageIndex: number;
  pageSize: number;
  totalItemCount: number;
  onChangePage: (pageIndex: number) => void;
}

export interface ThreatReportFeedProps {
  items: ThreatReportFeedItem[];
  /**
   * When true, `items` are already filtered/sorted/paginated by the server.
   * Client-side filter/sort is skipped so chip filters apply to the full set.
   */
  serverDriven?: boolean;
  isLoading?: boolean;
  /** When set (e.g. dashboard `stats_ribbon`), chip counts match global scope. */
  severityCounts?: Record<SeverityLevel, number>;
  /** When set (e.g. dashboard `by_category` buckets), chip counts match global scope. */
  categoryCounts?: Map<ThreatCategory, number>;
  /** Server-side pagination controls (Hub feed). */
  pagination?: ThreatReportFeedPagination;
  highlightReportId?: string;
  showFilterRow?: boolean;
  emptyMessage?: string;
  selectedSeverities: SeverityLevel[];
  selectedCategories: ThreatCategory[];
  onToggleSeverity: (severity: SeverityLevel) => void;
  onToggleCategory: (category: ThreatCategory) => void;
  onClearFilters: () => void;
  sortBy: ReportFeedSort;
  onSortChange: (next: ReportFeedSort) => void;
  onCorrelate?: (reportId: string) => void;
}

/**
 * Shared severity/category filter row + responsive card grid used by the
 * Intelligence Hub dashboard and Agent Builder digest attachments.
 */
export const ThreatReportFeed: React.FC<ThreatReportFeedProps> = ({
  items,
  serverDriven = false,
  isLoading = false,
  severityCounts: severityCountsProp,
  categoryCounts: categoryCountsProp,
  pagination,
  highlightReportId,
  showFilterRow = true,
  emptyMessage,
  selectedSeverities,
  selectedCategories,
  onToggleSeverity,
  onToggleCategory,
  onClearFilters,
  sortBy,
  onSortChange,
  onCorrelate,
}) => {
  const severityCounts = useMemo(
    () => severityCountsProp ?? countSeverities(items),
    [severityCountsProp, items]
  );
  const categoryCounts = useMemo(
    () => categoryCountsProp ?? countCategoriesFromItems(items),
    [categoryCountsProp, items]
  );

  const displayItems = useMemo(() => {
    if (serverDriven) {
      return items;
    }
    return filterAndSortFeedItems({
      items,
      selectedSeverities,
      selectedCategories,
      sortBy,
    });
  }, [serverDriven, items, selectedSeverities, selectedCategories, sortBy]);

  const totalAvailable = pagination?.totalItemCount ?? items.length;
  const totalShown = serverDriven ? totalAvailable : displayItems.length;
  const pageCount =
    pagination && pagination.pageSize > 0
      ? Math.max(1, Math.ceil(pagination.totalItemCount / pagination.pageSize))
      : 1;

  const sectionTitle = i18n.translate(
    'xpack.securitySolution.threatIntelligence.reportFeed.sectionTitle',
    { defaultMessage: 'Threat reports' }
  );

  const rangeStart =
    pagination && pagination.totalItemCount > 0
      ? pagination.pageIndex * pagination.pageSize + 1
      : 0;
  const rangeEnd = pagination
    ? Math.min((pagination.pageIndex + 1) * pagination.pageSize, pagination.totalItemCount)
    : displayItems.length;

  return (
    <>
      {showFilterRow ? (
        <>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="m"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2 data-test-subj="threatIntelReportFeedSectionTitle">{sectionTitle}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ReportFeedFilterRow
                severityCounts={severityCounts}
                categoryCounts={categoryCounts}
                selectedSeverities={selectedSeverities}
                selectedCategories={selectedCategories}
                onToggleSeverity={onToggleSeverity}
                onToggleCategory={onToggleCategory}
                onClear={onClearFilters}
                sortBy={sortBy}
                onSortChange={onSortChange}
                totalShown={totalShown}
                totalAvailable={totalAvailable}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      ) : null}
      {isLoading ? (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 120 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" data-test-subj="threatIntelReportFeedLoading" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <ReportFeedGrid
          items={displayItems}
          highlightReportId={highlightReportId}
          emptyMessage={emptyMessage}
          onCorrelate={onCorrelate}
        />
      )}
      {pagination && pagination.totalItemCount > 0 ? (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="m"
            responsive={false}
            wrap
          >
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued" data-test-subj="threatIntelReportFeedPageSummary">
                {i18n.translate(
                  'xpack.securitySolution.threatIntelligence.reportFeed.pageSummary',
                  {
                    defaultMessage: '{start}–{end} of {total}',
                    values: {
                      start: rangeStart,
                      end: rangeEnd,
                      total: pagination.totalItemCount,
                    },
                  }
                )}
              </EuiText>
            </EuiFlexItem>
            {pageCount > 1 ? (
              <EuiFlexItem grow={false}>
                <EuiPagination
                  aria-label={i18n.translate(
                    'xpack.securitySolution.threatIntelligence.reportFeed.paginationAria',
                    { defaultMessage: 'Threat reports pages' }
                  )}
                  pageCount={pageCount}
                  activePage={pagination.pageIndex}
                  onPageClick={pagination.onChangePage}
                  data-test-subj="threatIntelReportFeedPagination"
                />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </>
      ) : null}
    </>
  );
};
