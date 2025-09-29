/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState, type FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiEmptyPrompt } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import { GroupedItem } from './components/grouped_item/grouped_item';
import type { EntityItem } from './components/grouped_item/types';
import { Title } from './components/title';
import { ListHeader } from './components/list_header';
import { PanelBody, List } from './styles';
import { i18nNamespaceKey } from './constants';
import { useFetchDocumentDetails } from './use_fetch_document_details';
import { PaginationControls } from './components/pagination/pagination';

const loadingItems = i18n.translate(`${i18nNamespaceKey}.loading_items`, {
  defaultMessage: 'Loading group items...',
});

const groupItems = i18n.translate(`${i18nNamespaceKey}.items`, {
  defaultMessage: 'Items',
});

const noItemsFound = i18n.translate(`${i18nNamespaceKey}.no_items_found`, {
  defaultMessage: 'No items found in group',
});

const back = i18n.translate(`${i18nNamespaceKey}.back`, {
  defaultMessage: 'Back',
});

const somethingWentWrong = i18n.translate(`${i18nNamespaceKey}.somethingWentWrong`, {
  defaultMessage: 'Something went wrong',
});

const hosts = i18n.translate(`${i18nNamespaceKey}.types.hosts`, {
  defaultMessage: 'Hosts',
});

const entities = i18n.translate(`${i18nNamespaceKey}.types.entities`, {
  defaultMessage: 'Entities',
});

const events = i18n.translate(`${i18nNamespaceKey}.types.events`, {
  defaultMessage: 'Events',
});

const translateEntityType = (type?: string) => {
  if (!type) return entities;

  // TODO Add more case branches for all possible types
  switch (type) {
    case 'host':
      return hosts;
    default:
      return entities;
  }
};

export interface GraphGroupedNodePreviewPanelProps {
  showLoadingState?: boolean;
  docMode: 'grouped-entities' | 'grouped-events';
  // events/alerts IDs to fetch details from ES
  dataViewId: DataView['id'];
  documentIds: string[];
  // entities data reused from graph
  entityItems: EntityItem[];
}

/**
 * Panel to be displayed in the document details expandable flyout on top of right section
 */
export const GraphGroupedNodePreviewPanel: FC<GraphGroupedNodePreviewPanelProps> = memo(
  ({ showLoadingState, docMode, dataViewId, documentIds, entityItems }) => {
    // Pagination
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const onChangeItemsPerPage = useCallback(
      (pageSize: number) =>
        setPagination({
          pageSize,
          pageIndex: 0,
        }),
      [setPagination]
    );
    const onChangePage = useCallback(
      (pageIndex: number) => setPagination((pageState) => ({ ...pageState, pageIndex })),
      [setPagination]
    );

    const { data, isLoading, isFetching } = useFetchDocumentDetails({
      dataViewId,
      ids: documentIds,
      pageIndex: pagination.pageIndex,
      options: { pageSize: pagination.pageSize, enabled: docMode === 'grouped-events' },
    });

    const items =
      docMode === 'grouped-entities'
        ? entityItems.slice(
            pagination.pageIndex * pagination.pageSize,
            (pagination.pageIndex + 1) * pagination.pageSize
          )
        : data?.page || [];
    const totalHits = docMode === 'grouped-entities' ? entityItems.length : data?.total || 0;

    if (showLoadingState || isLoading || isFetching) {
      return (
        <PanelBody>
          <Title icon="index" text={loadingItems} />
          <ListHeader artifactType={groupItems} />
          <List>
            <GroupedItem isLoading />
            <GroupedItem isLoading />
            <GroupedItem isLoading />
          </List>
        </PanelBody>
      );
    }

    if (items.length === 0) {
      return (
        <PanelBody>
          <EuiEmptyPrompt
            color="subdued"
            title={<h2>{somethingWentWrong}</h2>}
            layout="vertical"
            body={<p>{noItemsFound}</p>}
            actions={[
              <EuiButtonEmpty
                iconType="arrowLeft"
                flush="both"
                onClick={() => {}}
                aria-label={back}
              >
                {back}
              </EuiButtonEmpty>,
            ]}
          />
        </PanelBody>
      );
    }

    const areAllEntities = docMode === 'grouped-entities';
    const artifactType = areAllEntities
      ? translateEntityType((items[0] as EntityItem).type)
      : events;

    return (
      <PanelBody>
        <Title
          icon={areAllEntities ? (items[0] as EntityItem).icon : 'index'}
          text={artifactType}
          count={totalHits}
        />
        <ListHeader artifactType={artifactType} />
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
  }
);

GraphGroupedNodePreviewPanel.displayName = 'GraphGroupedNodePreviewPanel';
