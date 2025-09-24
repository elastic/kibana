/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, type FC } from 'react';
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
  // id: string;
  // indexName: string;
  // scopeId: string;
  // isPreviewMode?: boolean;
  // jumpToEntityId?: string;
  // jumpToCursor?: string;
  // id: string;
  // scopeId: string;
  // isPreviewMode?: boolean;
  showLoadingState?: boolean;
  dataViewId: DataView['id'];
  documentIds: string[];
}

/**
 * Panel to be displayed in the document details expandable flyout on top of right section
 */
export const GraphGroupedNodePreviewPanel: FC<GraphGroupedNodePreviewPanelProps> = memo(
  ({ showLoadingState, dataViewId, documentIds }) => {
    const { data: items, isLoading } = useFetchDocumentDetails({ dataViewId, ids: documentIds });

    if (showLoadingState || isLoading) {
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

    console.log({ dataViewId, documentIds });
    console.log({ items });

    if (documentIds.length === 0 || items.length === 0)
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

    const areAllEntities = items.every((item) => item.itemType === 'entity');
    const artifactType = areAllEntities
      ? translateEntityType((items[0] as EntityItem).type)
      : events;

    return (
      <PanelBody>
        <Title
          icon={areAllEntities ? (items[0] as EntityItem).icon : 'index'}
          text={artifactType}
          count={items.length}
        />
        <ListHeader artifactType={artifactType} />
        <List>
          {items.map((item) => (
            <li key={item.id}>
              <GroupedItem item={item} />
            </li>
          ))}
        </List>
      </PanelBody>
    );
  }
);

GraphGroupedNodePreviewPanel.displayName = 'GraphGroupedNodePreviewPanel';
