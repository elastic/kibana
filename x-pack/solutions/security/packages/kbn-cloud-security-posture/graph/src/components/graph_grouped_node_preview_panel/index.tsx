/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, type FC } from 'react';
import { i18n } from '@kbn/i18n';
import { GroupedItem } from './components/grouped_item/grouped_item';
import type { EntityOrEventItem, EntityItem } from './components/grouped_item/types';
import { Title } from './components/title';
import { ListHeader } from './components/list_header';
import { PanelBody, List } from './styles';
import { i18nNamespaceKey } from './constants';

// TODO Add more translations
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
  items: EntityOrEventItem[];
}

/**
 * Panel to be displayed in the document details expandable flyout on top of right section
 */
export const GraphGroupedNodePreviewPanel: FC<Partial<GraphGroupedNodePreviewPanelProps>> = memo(
  ({ items }) => {
    if (!items || items.length === 0) return null;

    // console.log({ items });

    const areAllEntities = items.every((item) => item.type === 'entity');
    const artifactType = areAllEntities
      ? translateEntityType((items[0] as EntityItem).tag)
      : events;

    return (
      <>
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
            <GroupedItem item={items[0]} isLoading />
          </List>
        </PanelBody>
      </>
    );
  }
);

GraphGroupedNodePreviewPanel.displayName = 'GraphGroupedNodePreviewPanel';
