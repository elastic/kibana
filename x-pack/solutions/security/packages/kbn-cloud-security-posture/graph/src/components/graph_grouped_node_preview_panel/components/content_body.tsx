/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { PanelBody, List } from '../styles';
import { i18nNamespaceKey } from '../constants';
import { CONTENT_BODY_TEST_ID } from '../test_ids';
import { Title } from './title';
import { ListHeader } from './list_header';
import { GroupedItem } from './grouped_item/grouped_item';
import type { EntityOrEventItem } from './grouped_item/types';
import { PaginationControls } from './pagination_controls';
import { DEFAULT_PAGE_SIZE, type Pagination } from '../use_pagination';

const maxDocumentsShownLabel = i18n.translate(`${i18nNamespaceKey}.maxDocumentsShownLabel`, {
  defaultMessage: '(Maximum 50 document details shown)',
});

export interface ContentBodyProps {
  items: EntityOrEventItem[];
  totalHits: number;
  icon: string;
  groupedItemsType: string;
  pagination: Pagination;
  /**
   * Unique identifier for the graph instance, used to scope filter state.
   */
  scopeId: string;
}

export const ContentBody: FC<ContentBodyProps> = ({
  items,
  totalHits,
  icon,
  groupedItemsType,
  pagination,
  scopeId,
}) => {
  // Show pagination only when there are more items than fit on a single page with default size
  const shouldShowPagination = totalHits > DEFAULT_PAGE_SIZE;
  return (
    <PanelBody data-test-subj={CONTENT_BODY_TEST_ID}>
      <Title icon={icon} text={groupedItemsType} count={totalHits} />
      <ListHeader groupedItemsType={groupedItemsType} />
      <EuiText size="s">{maxDocumentsShownLabel}</EuiText>
      <List>
        {items.map((item, index) => (
          // `entity.id` is not guaranteed to be unique within a group (ideally the
          // server dedupes, but the UI must not rely on it). Duplicate sibling keys
          // break React reconciliation, leaving stale <li> nodes from a previously
          // previewed group mounted when switching between grouped nodes (issue
          // #275261). Suffix the index to guarantee a unique key per rendered item.
          <li key={'docId' in item ? item.docId : `${item.id}-${index}`}>
            <GroupedItem item={item} scopeId={scopeId} />
          </li>
        ))}
      </List>
      {shouldShowPagination && (
        <PaginationControls
          totalHits={totalHits}
          pagination={pagination.state}
          goToPage={pagination.goToPage}
          setPageSize={pagination.setPageSize}
        />
      )}
    </PanelBody>
  );
};
