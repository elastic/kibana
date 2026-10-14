/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { CollectionCardItem } from './collection_card';
import { getCollectionGroupId, isCollectionCard } from './collection_card';
import { useFleetCards } from './fleet_cards_provider';

/**
 * Fleet's collection cards keyed by group id, untouched. Empty until Fleet's packages
 * load and with the collection tiles flag off, so callers fall back to plain navigation.
 */
export const useCollectionCards = (): Map<string, CollectionCardItem> => {
  const { allCards } = useFleetCards();

  return useMemo(() => {
    const byGroupId = new Map<string, CollectionCardItem>();
    for (const card of allCards) {
      if (isCollectionCard(card)) byGroupId.set(getCollectionGroupId(card), card);
    }
    return byGroupId;
  }, [allCards]);
};
