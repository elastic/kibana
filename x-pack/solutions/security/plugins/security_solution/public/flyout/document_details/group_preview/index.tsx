/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, type FC } from 'react';
import { i18n } from '@kbn/i18n';
import { GroupedListItem } from './components/list_item/list_item';
import type {
  GroupedListItem as GroupedListItemRecord,
  EntityItem,
} from './components/list_item/types';
import { Title } from './components/title';
import { EventFilters } from './components/event_filters';
import { SearchBar } from './components/search_bar';
import { ListHeader } from './components/list_header';
import { PanelBody, List, ControlsSection } from './styles';

// TODO Add more translations
const hosts = i18n.translate('xpack.securitySolution.flyout.groupPreview.types.hosts', {
  defaultMessage: 'Hosts',
});

const entities = i18n.translate('xpack.securitySolution.flyout.groupPreview.types.entities', {
  defaultMessage: 'Entities',
});

const events = i18n.translate('xpack.securitySolution.flyout.groupPreview.types.events', {
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

export interface DocumentDetailsGroupPreviewPanelProps {
  // id: string;
  // indexName: string;
  // scopeId: string;
  // isPreviewMode?: boolean;
  // jumpToEntityId?: string;
  // jumpToCursor?: string;
  // id: string;
  // scopeId: string;
  // isPreviewMode?: boolean;
  items: GroupedListItemRecord[];
}

/**
 * Panel to be displayed in the document details expandable flyout on top of right section
 */
export const GroupPreviewPanel: FC<Partial<DocumentDetailsGroupPreviewPanelProps>> = memo(
  ({ items }) => {
    if (!items || items.length === 0) return null;

    const handleEventFilterChange = () => {
      // TODO
    };

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
          <ControlsSection>
            <EventFilters onChange={handleEventFilterChange} />
            <SearchBar />
          </ControlsSection>
          <ListHeader artifactType={artifactType} />
          <List>
            {items.map((item) => (
              <li key={item.id}>
                <GroupedListItem item={item} />
              </li>
            ))}
            <GroupedListItem item={items[0]} isLoading />
          </List>
        </PanelBody>
      </>
    );
  }
);

GroupPreviewPanel.displayName = 'GroupPreviewPanel';
