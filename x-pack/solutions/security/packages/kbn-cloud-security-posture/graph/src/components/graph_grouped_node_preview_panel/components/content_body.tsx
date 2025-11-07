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
}

export const ContentBody: FC<ContentBodyProps> = ({
  items,
  totalHits,
  icon,
  groupedItemsType,
  pagination,
}) => {
  // Show pagination only when there are more items than fit on a single page with default size
  const shouldShowPagination = totalHits > DEFAULT_PAGE_SIZE;

  return (
    <PanelBody data-test-subj={CONTENT_BODY_TEST_ID}>
      <Title icon={icon} text={groupedItemsType} count={totalHits} />
      <ListHeader groupedItemsType={groupedItemsType} />
      <EuiText size="s">{maxDocumentsShownLabel}</EuiText>
      <List>
        {items.map((item) => (
          // React key must be `docId` for fetched documents (events & alerts)
          // Fallback to `id` for non-fetched entities
          <li key={'docId' in item ? item.docId : item.id}>
            <GroupedItem item={item} />
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
