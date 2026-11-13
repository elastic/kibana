/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiButtonGroup,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getWikiEntityTypeLabel, getWikiStatusFilterLabel } from './entity_type_labels';
import {
  WIKI_ENTITY_TYPES,
  WIKI_PAGE_STATUSES,
  type WikiEntityType,
  type WikiPageSummary,
  type WikiStatusFilter,
} from './types';

export type WikiSidebarSelection =
  | { kind: 'home' }
  | { kind: 'activity' }
  | { kind: 'page'; id: string };

interface WikiSidebarProps {
  pages: WikiPageSummary[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: WikiStatusFilter;
  onStatusFilterChange: (value: WikiStatusFilter) => void;
  selection: WikiSidebarSelection;
  onSelect: (selection: WikiSidebarSelection) => void;
}

const matchesSearch = (page: WikiPageSummary, query: string): boolean => {
  if (query.length === 0) {
    return true;
  }
  const haystack = `${page.title} ${page.description ?? ''}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
};

export function WikiSidebar({
  pages,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  selection,
  onSelect,
}: WikiSidebarProps) {
  const statusFilters: WikiStatusFilter[] = pages.some((page) => page.status === 'archived')
    ? ['all', ...WIKI_PAGE_STATUSES]
    : ['all', 'established', 'tentative'];
  // Restoring the last archived page removes the Archived option out from under the selection.
  const activeFilter = statusFilters.includes(statusFilter) ? statusFilter : 'all';

  const visiblePages = useMemo(
    () =>
      pages.filter((page) => {
        if (activeFilter !== 'all' && page.status !== activeFilter) {
          return false;
        }
        return matchesSearch(page, searchQuery);
      }),
    [pages, searchQuery, activeFilter]
  );

  const pagesByType = useMemo(() => {
    const grouped = new Map<WikiEntityType, WikiPageSummary[]>();
    for (const entityType of WIKI_ENTITY_TYPES) {
      const typePages = visiblePages.filter((page) => page.entity_type === entityType);
      if (typePages.length > 0) {
        grouped.set(entityType, typePages);
      }
    }
    return grouped;
  }, [visiblePages]);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      className={css`
        height: 100%;
        min-height: 0;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiFieldSearch
          compressed
          incremental
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={i18n.translate('xpack.nightshift.knowledge.wiki.searchPlaceholder', {
            defaultMessage: 'Search pages',
          })}
          aria-label={i18n.translate('xpack.nightshift.knowledge.wiki.searchAriaLabel', {
            defaultMessage: 'Search Wiki pages',
          })}
          data-test-subj="nightshiftWikiSearch"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          legend={i18n.translate('xpack.nightshift.knowledge.wiki.statusFilterLegend', {
            defaultMessage: 'Page status',
          })}
          type="single"
          buttonSize="compressed"
          isFullWidth
          options={statusFilters.map((filter) => ({
            id: filter,
            label: getWikiStatusFilterLabel(filter),
            'data-test-subj': `nightshiftWikiStatusFilter-${filter}`,
          }))}
          idSelected={activeFilter}
          onChange={(id) => onStatusFilterChange(id as WikiStatusFilter)}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiListGroup maxWidth={false}>
          <EuiListGroupItem
            iconType="home"
            label={
              <FormattedMessage
                id="xpack.nightshift.knowledge.wiki.homeNavLabel"
                defaultMessage="Home"
              />
            }
            isActive={selection.kind === 'home'}
            onClick={() => onSelect({ kind: 'home' })}
            data-test-subj="nightshiftWikiHomeNav"
          />
          <EuiListGroupItem
            iconType="clock"
            label={
              <FormattedMessage
                id="xpack.nightshift.knowledge.wiki.activityNavLabel"
                defaultMessage="Activity"
              />
            }
            isActive={selection.kind === 'activity'}
            onClick={() => onSelect({ kind: 'activity' })}
            data-test-subj="nightshiftWikiActivityNav"
          />
        </EuiListGroup>
      </EuiFlexItem>
      <EuiFlexItem
        className={css`
          overflow-y: auto;
          min-height: 0;
        `}
      >
        {pagesByType.size === 0 ? (
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.nightshift.knowledge.wiki.emptyTypeDescription"
              defaultMessage="No pages yet."
            />
          </EuiText>
        ) : (
          [...pagesByType.entries()].map(([entityType, typePages]) => (
            <EuiAccordion
              key={entityType}
              id={`nightshift-wiki-${entityType}`}
              initialIsOpen={true}
              buttonContent={
                <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
                  <EuiFlexItem>
                    <EuiText size="xs">
                      <strong>{getWikiEntityTypeLabel(entityType)}</strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {typePages.length}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              paddingSize="s"
            >
              <EuiListGroup
                maxWidth={false}
                className={css`
                  .euiListGroupItem__label {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                  }
                `}
              >
                {typePages.map((page) => (
                  <EuiListGroupItem
                    key={page.id}
                    label={page.title}
                    isActive={selection.kind === 'page' && selection.id === page.id}
                    onClick={() => onSelect({ kind: 'page', id: page.id })}
                    data-test-subj={`nightshiftWikiPageLink-${page.id}`}
                  />
                ))}
              </EuiListGroup>
            </EuiAccordion>
          ))
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
