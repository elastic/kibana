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
import { Title } from './title';
import { ListHeader } from './list_header';
import { GroupedItem } from './grouped_item/grouped_item';
import type { EntityOrEventItem } from './grouped_item/types';
import { PaginationControls } from './pagination_controls';

const maxDocumentsShownLabel = i18n.translate(`${i18nNamespaceKey}.maxDocumentsShownLabel`, {
  defaultMessage: '(Maximum 50 document details shown)',
});

export interface ContentBodyProps {
  items: EntityOrEventItem[];
  totalHits: number;
  icon: string;
  groupedItemsType: string;
  pagination: { pageIndex: number; pageSize: number };
  onChangePage: (pageIndex: number) => void;
  onChangeItemsPerPage: (pageSize: number) => void;
}

export const ContentBody: FC<ContentBodyProps> = ({
  items,
  totalHits,
  icon,
  groupedItemsType,
  pagination,
  onChangePage,
  onChangeItemsPerPage,
}) => (
  <PanelBody>
    <Title icon={icon} text={groupedItemsType} count={totalHits} />
    <ListHeader groupedItemsType={groupedItemsType} />
    <EuiText size="s">{maxDocumentsShownLabel}</EuiText>
    <List>
      {items.map((item) => (
        <li key={item.id}>
          <GroupedItem item={item} />
        </li>
      ))}
    </List>
    <PaginationControls
      pageIndex={pagination.pageIndex}
      pageSize={pagination.pageSize}
      pageCount={Math.ceil(totalHits / pagination.pageSize)}
      onChangePage={onChangePage}
      onChangeItemsPerPage={onChangeItemsPerPage}
    />
  </PanelBody>
);
