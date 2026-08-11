/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CardIcon } from '@kbn/fleet-plugin/public';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { CuratedTileCard } from '../add_data_grid';

const EXTERNAL_URL_PATTERN = /^https?:\/\//;

/** Search results reuse the curated grid's tile card, so they look the same. */
export const renderResultCard = (item: IntegrationCardItem): React.ReactNode => (
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
    descriptionLineCount={1}
  />
);
