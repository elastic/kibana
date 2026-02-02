/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, type FC } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useFetchDocumentDetails } from './use_fetch_document_details';
import { usePagination } from './use_pagination';
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

/**
 * Hook that handles pagination for both client-side and server-side scenarios
 * - grouped-entities: Client-side pagination by slicing the in-memory entityItems array
 * - grouped-events: Server-side pagination using data already paginated by Elasticsearch
 */
const usePaginatedData = (
  docMode: 'grouped-entities' | 'grouped-events',
  entityItems: EntityItem[],
  pagination: { pageIndex: number; pageSize: number },
  fetchedData?: { page: EntityOrEventItem[]; total: number }
): PaginatedData => {
  return useMemo(() => {
    if (docMode === 'grouped-entities') {
      // Client-side pagination: slice the in-memory array
      const startIndex = pagination.pageIndex * pagination.pageSize;
      const endIndex = startIndex + pagination.pageSize;
      return {
        items: entityItems.slice(startIndex, endIndex),
        totalHits: entityItems.length,
      };
    }

    // Server-side pagination: use data already paginated by ES
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
    // Initialize pagination state with localStorage persistence
    // - For 'grouped-entities': Pass entityItems.length to enable client-side pagination validation
    // - For 'grouped-events': Pass 0 since events use server-side pagination (handled by useFetchDocumentDetails)
    const pagination = usePagination(docMode === 'grouped-entities' ? entityItems.length : 0);

    const { data, isLoading, refresh } = useFetchDocumentDetails({
      dataViewId,
      ids: documentIds,
      options: {
        pageIndex: pagination.state.pageIndex,
        pageSize: pagination.state.pageSize,
        enabled: docMode === 'grouped-events',
      },
    });

    const { items, totalHits } = usePaginatedData(docMode, entityItems, pagination.state, data);
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
      />
    );
  }
);

GraphGroupedNodePreviewPanel.displayName = 'GraphGroupedNodePreviewPanel';
