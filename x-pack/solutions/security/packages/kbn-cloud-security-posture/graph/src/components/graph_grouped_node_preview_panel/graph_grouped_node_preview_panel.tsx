/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, type FC } from 'react';
import { i18n } from '@kbn/i18n';
import type { EntityItem } from '@kbn/cloud-security-posture-common/types/graph_entities/v1';
import type { EventOrAlertItem } from '@kbn/cloud-security-posture-common/types/graph_events/v1';
import { useFetchDocumentDetails } from './use_fetch_document_details';
import { LoadingBody } from './components/loading_body';
import { EmptyBody } from './components/empty_body';
import { ContentBody } from './components/content_body';
import { i18nNamespaceKey } from './constants';
import { usePagination } from './use_pagination';

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
  /** Type of documents: entities or events/alerts */
  type: 'entities' | 'events';
  /** Array of document IDs to fetch */
  documentIds: string[];
  /** Time range start */
  start: string | number;
  /** Time range end */
  end: string | number;
}

interface ContentMetadata {
  icon: string;
  groupedItemsType: string;
}

const useContentMetadata = (
  type: 'entities' | 'events',
  items: Array<EntityItem | EventOrAlertItem>
): ContentMetadata => {
  return useMemo(() => {
    const isEntityMode = type === 'entities';

    if (isEntityMode && items.length > 0) {
      const entityItems = items as EntityItem[];
      const firstType = entityItems[0].type;
      const allSameType = entityItems.every((e) => e.type === firstType);

      if (allSameType && firstType !== undefined) {
        return {
          icon: entityItems[0].icon || 'magnifyWithExclamation',
          groupedItemsType: translateEntityType(firstType),
        };
      }

      // Multiple different ECS parent types — use generic icon
      return {
        icon: 'magnifyWithExclamation',
        groupedItemsType: entities,
      };
    }

    return {
      icon: 'index',
      groupedItemsType: events,
    };
  }, [type, items]);
};

/**
 * Panel to be displayed in the document details expandable flyout on top of right section.
 * Fetches enriched document details from the server API and displays them with pagination.
 *
 * Pagination is handled server-side to support thousands of document IDs efficiently.
 */
export const GraphGroupedNodePreviewPanel: FC<GraphGroupedNodePreviewPanelProps> = memo(
  ({ type, documentIds, start, end }) => {
    // Initialize pagination state (server-side)
    const pagination = usePagination(0);

    const { data, isLoading, refresh } = useFetchDocumentDetails({
      type,
      documentIds,
      start,
      end,
      page: {
        index: pagination.state.pageIndex,
        size: pagination.state.pageSize,
      },
      options: {
        enabled: documentIds.length > 0,
      },
    });

    const { icon, groupedItemsType } = useContentMetadata(type, data.items);

    if (isLoading) {
      return <LoadingBody />;
    }

    if (data.items.length === 0) {
      return <EmptyBody onRefresh={refresh} />;
    }

    return (
      <ContentBody
        items={data.items}
        totalHits={data.totalRecords}
        icon={icon}
        groupedItemsType={groupedItemsType}
        pagination={pagination}
      />
    );
  }
);

GraphGroupedNodePreviewPanel.displayName = 'GraphGroupedNodePreviewPanel';
