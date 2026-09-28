/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CardIcon } from '@kbn/fleet-plugin/public';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { CuratedTileCard, VariantCountBadge } from '../add_data_grid';
import { getCollectionGroupId, isCollectionCard } from './collection_card';

const EXTERNAL_URL_PATTERN = /^https?:\/\//;

/** Search results reuse the curated grid's tile card, so they look the same. */
const renderPlainCard = (item: IntegrationCardItem): React.ReactNode => (
  <CuratedTileCard
    tile={{
      id: item.id,
      title: item.title,
      description: item.description,
      icon: (
        <CardIcon icons={item.icons} packageName={item.name} version={item.version} size="xl" />
      ),
      href: item.url,
      // Matches PackageCard's own http(s) check, so external items still open in a new tab.
      target: EXTERNAL_URL_PATTERN.test(item.url) ? '_blank' : undefined,
      onClick: item.onCardClick,
      'data-test-subj': `addDataResultCard-${item.id}`,
    }}
  />
);

export interface RenderResultCardOptions {
  /** Names the chooser to open in the url, which is what renders the flyout. */
  onOpenCollection: (groupId: string) => void;
}

/**
 * Collection cards open the page-hosted chooser instead of navigating, so the
 * renderer closes over that callback instead of being a static function.
 */
export const createRenderResultCard =
  ({ onOpenCollection }: RenderResultCardOptions) =>
  (item: IntegrationCardItem): React.ReactNode => {
    if (!isCollectionCard(item)) {
      return renderPlainCard(item);
    }

    return (
      <CuratedTileCard
        tile={{
          id: item.id,
          title: item.title,
          description: item.description,
          icon: (
            <CardIcon icons={item.icons} packageName={item.name} version={item.version} size="xl" />
          ),
          badge: <VariantCountBadge count={item.groupMembers.length} />,
          onClick: () => onOpenCollection(getCollectionGroupId(item)),
          'data-test-subj': `addDataResultCard-${item.id}`,
        }}
      />
    );
  };
