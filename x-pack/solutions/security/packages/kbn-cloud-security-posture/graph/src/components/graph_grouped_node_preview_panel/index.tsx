/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState, type FC } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useFetchDocumentDetails } from './use_fetch_document_details';
import type { EntityItem, EntityOrEventItem } from './components/grouped_item/types';
import { LoadingBody } from './components/loading_body';
import { EmptyBody } from './components/empty_body';
import { ContentBody } from './components/content_body';
import { i18nNamespaceKey } from './constants';

const hosts = i18n.translate(`${i18nNamespaceKey}.types.hosts`, {
  defaultMessage: 'Hosts',
});

const users = i18n.translate(`${i18nNamespaceKey}.types.users`, {
  defaultMessage: 'Users',
});

const entities = i18n.translate(`${i18nNamespaceKey}.types.entities`, {
  defaultMessage: 'Entities',
});

const events = i18n.translate(`${i18nNamespaceKey}.types.events`, {
  defaultMessage: 'Events',
});

const translateEntityType = (type?: string): string => {
  if (!type) return entities;

  // TODO Add more case branches for all possible types
  switch (type) {
    case 'host':
      return hosts;
    case 'user':
      return users;
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

interface PaginatedData {
  items: EntityOrEventItem[];
  totalHits: number;
}

interface ContentMetadata {
  icon: string;
  groupedItemsType: string;
}

const usePaginatedData = (
  docMode: 'grouped-entities' | 'grouped-events',
  entityItems: EntityItem[],
  pagination: { pageIndex: number; pageSize: number },
  fetchedData?: { page: EntityOrEventItem[]; total: number }
): PaginatedData => {
  return useMemo(() => {
    if (docMode === 'grouped-entities') {
      const startIndex = pagination.pageIndex * pagination.pageSize;
      const endIndex = startIndex + pagination.pageSize;
      return {
        items: entityItems.slice(startIndex, endIndex),
        totalHits: entityItems.length,
      };
    }

    return {
      items: fetchedData?.page || [],
      totalHits: fetchedData?.total || 0,
    };
  }, [docMode, entityItems, pagination.pageIndex, pagination.pageSize, fetchedData]);
};

const useContentMetadata = (
  docMode: 'grouped-entities' | 'grouped-events',
  items: EntityOrEventItem[]
): ContentMetadata => {
  return useMemo(() => {
    const isEntityMode = docMode === 'grouped-entities';
    const firstItem = items[0];

    if (isEntityMode && firstItem) {
      const entityItem = firstItem as EntityItem;
      return {
        icon: entityItem.icon || 'index',
        groupedItemsType: translateEntityType(entityItem.type),
      };
    }

    return {
      icon: 'index',
      groupedItemsType: events,
    };
  }, [docMode, items]);
};

/**
 * Panel to be displayed in the document details expandable flyout on top of right section
 */
export const GraphGroupedNodePreviewPanel: FC<GraphGroupedNodePreviewPanelProps> = memo(
  ({ docMode, dataViewId, documentIds, entityItems }) => {
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

    const onChangeItemsPerPage = useCallback((pageSize: number) => {
      setPagination({ pageSize, pageIndex: 0 });
    }, []);

    const onChangePage = useCallback((pageIndex: number) => {
      setPagination((prevState) => ({ ...prevState, pageIndex }));
    }, []);

    const { data, isLoading, refresh } = useFetchDocumentDetails({
      dataViewId,
      ids: documentIds,
      options: {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        enabled: docMode === 'grouped-events',
      },
    });

    const { items, totalHits } = usePaginatedData(docMode, entityItems, pagination, data);
    const { icon, groupedItemsType } = useContentMetadata(docMode, items);

    if (isLoading) {
      return <LoadingBody />;
    }

    if (items.length === 0) {
      return <EmptyBody onRefresh={refresh} />;
    }

    return (
      <ContentBody
        items={items}
        totalHits={totalHits}
        icon={icon}
        groupedItemsType={groupedItemsType}
        pagination={pagination}
        onChangePage={onChangePage}
        onChangeItemsPerPage={onChangeItemsPerPage}
      />
    );
  }
);

GraphGroupedNodePreviewPanel.displayName = 'GraphGroupedNodePreviewPanel';
