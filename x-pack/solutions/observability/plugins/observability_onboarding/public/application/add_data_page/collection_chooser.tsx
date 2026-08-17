/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CardIcon } from '@kbn/fleet-plugin/public';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import type { CollectionVariant } from '../add_data_grid';
import { CollectionFlyout } from '../add_data_grid';
import type { OnboardingReturnState } from '../package_list_search_form/use_card_url_rewrite';
import { rewriteCardUrl } from '../package_list_search_form/use_card_url_rewrite';
import { useCollectionCards } from './use_collection_cards';

interface Props {
  /** Group id named in the url, the page's only record of the open chooser. */
  collection?: string;
  /** Current search term, carried into member return paths when present. */
  searchTerm: string;
  onClose: () => void;
}

/**
 * Turns Fleet's members into chooser rows. Members are the only cards here that
 * navigate away, so they alone carry the return params that bring the user back
 * to this page with the chooser reopened.
 */
const toVariants = (
  members: IntegrationCardItem[],
  returnState: OnboardingReturnState
): CollectionVariant[] =>
  members.map((member) => ({
    id: member.id,
    title: member.title,
    description: member.description,
    icon: (
      <CardIcon icons={member.icons} packageName={member.name} version={member.version} size="l" />
    ),
    href: rewriteCardUrl(member, returnState).url,
    'data-test-subj': `collectionVariantRow-${member.id}`,
  }));

/**
 * The open chooser, derived from the group id in the url rather than tracked
 * alongside it: a refresh, a "Back to selection" return and a click on a tile
 * all reduce to the same url, and refreshed Fleet packages reach an open
 * chooser. It resolves against the raw card list, not the search results,
 * because a chooser opened from a curated grid tile has no search term. No
 * match (Fleet flag off, group retired, packages still loading) renders
 * nothing.
 */
export const CollectionChooser = ({ collection, searchTerm, onClose }: Props) => {
  const collections = useCollectionCards();
  const card = collection ? collections.get(collection) : undefined;

  if (!collection || !card) return null;

  return (
    <CollectionFlyout
      title={card.title}
      description={card.description}
      variants={toVariants(card.groupMembers, {
        category: null,
        search: searchTerm || undefined,
        collection,
      })}
      onClose={onClose}
    />
  );
};
