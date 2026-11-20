/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiCode,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { RuleLibraryBadge } from '../../../../common/components/rule_library_badge';
import type { LibraryListPlaceholderRow, RuleLibraryListItem } from '../types';
import * as i18n from '../translations';

interface LibraryListsPlaceholderProps {
  // Whether to show which library each list comes from.
  showLibrary: boolean;
  kind: 'exceptionLists' | 'valueLists';
  rows: readonly LibraryListPlaceholderRow[];
  libraries: readonly RuleLibraryListItem[];
}

const ListItemsPreview = ({ row }: { row: LibraryListPlaceholderRow }) => {
  if (row.summary) {
    return <EuiCode>{row.summary}</EuiCode>;
  }

  const preview = row.preview ?? [];
  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
      {preview.map((value) => (
        <EuiFlexItem key={value} grow={false}>
          <EuiBadge color="hollow">
            <code>{value}</code>
          </EuiBadge>
        </EuiFlexItem>
      ))}
      {row.itemCount > preview.length ? (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{i18n.MORE_ITEMS(row.itemCount - preview.length)}</EuiBadge>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

export const LibraryListsPlaceholder = ({
  showLibrary,
  kind,
  rows,
  libraries,
}: LibraryListsPlaceholderProps) => {
  const [query, setQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return rows;
    }
    return rows.filter(({ name, listId }) =>
      [name, listId].join(' ').toLowerCase().includes(normalizedQuery)
    );
  }, [rows, query]);

  const toggleExpanded = (id: string) =>
    setExpandedIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });

  const expandedRowMap = Object.fromEntries(
    filteredRows
      .filter(({ id }) => expandedIds.has(id))
      .map((row) => [row.id, <ListItemsPreview key={row.id} row={row} />])
  );

  const columns: Array<EuiBasicTableColumn<LibraryListPlaceholderRow>> = [
    {
      name: i18n.COLUMN_LIST,
      render: ({ id, name, description, libraryId }: LibraryListPlaceholderRow) => {
        const library = libraries.find((item) => item.id === libraryId);
        return (
          <div>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{name}</strong>
                </EuiText>
              </EuiFlexItem>
              {library && showLibrary ? (
                <EuiFlexItem grow={false}>
                  <RuleLibraryBadge
                    library={{ id: library.id, title: library.title, icon: library.icon }}
                  />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
            <EuiText size="xs" color="subdued">
              {description}
            </EuiText>
            <EuiButtonEmpty
              size="xs"
              flush="left"
              onClick={() => toggleExpanded(id)}
              data-test-subj="toggleListItemsLink"
            >
              {expandedIds.has(id) ? i18n.HIDE_ITEMS : i18n.VIEW_ITEMS}
            </EuiButtonEmpty>
          </div>
        );
      },
      width: '45%',
    },
    {
      name: i18n.COLUMN_LIST_ID,
      render: ({ listId }: LibraryListPlaceholderRow) => <EuiCode>{listId}</EuiCode>,
    },
    {
      name: i18n.COLUMN_TYPE,
      render: ({ type }: LibraryListPlaceholderRow) => <EuiBadge color="hollow">{type}</EuiBadge>,
    },
    {
      field: 'itemCount',
      name: i18n.COLUMN_ITEMS,
    },
  ];

  return (
    <>
      <KbnInfoCallout
        announceOnMount={false}
        size="s"
        title={i18n.LISTS_COMING_LATER_TITLE}
        text={<p>{i18n.LISTS_COMING_LATER_BODY}</p>}
        data-test-subj="ruleLibraryListsComingLater"
      />
      <EuiSpacer size="m" />
      <EuiFieldSearch
        fullWidth
        value={query}
        placeholder={
          kind === 'exceptionLists'
            ? i18n.SEARCH_EXCEPTION_LISTS_PLACEHOLDER
            : i18n.SEARCH_VALUE_LISTS_PLACEHOLDER
        }
        aria-label={i18n.SEARCH_LISTS_ARIA_LABEL}
        onChange={(event) => setQuery(event.target.value)}
        data-test-subj="ruleLibraryListsSearch"
      />
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        {i18n.SHOWING_LISTS(filteredRows.length)}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiBasicTable<LibraryListPlaceholderRow>
        tableCaption={i18n.LISTS_TABLE_CAPTION}
        items={[...filteredRows]}
        itemId="id"
        itemIdToExpandedRowMap={expandedRowMap}
        columns={columns}
        noItemsMessage={i18n.NO_LISTS}
      />
    </>
  );
};
