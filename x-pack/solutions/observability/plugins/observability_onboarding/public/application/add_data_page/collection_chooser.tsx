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
import { CollectionFlyout, RecommendedBadge } from '../add_data_grid';
import type { OnboardingReturnState } from '../package_list_search_form/use_card_url_rewrite';
import { rewriteCardUrl } from '../package_list_search_form/use_card_url_rewrite';
import { findRecommendedMember, orderMembers } from './recommended_variant';
import { useCollectionCards } from './use_collection_cards';

interface Props {
  /** Group id in the url. */
  collection?: string;
  searchTerm: string;
  onClose: () => void;
}

const toVariants = (
  members: IntegrationCardItem[],
  returnState: OnboardingReturnState
): CollectionVariant[] => {
  const recommended = findRecommendedMember(members);
  return orderMembers(members).map((member) => ({
    id: member.id,
    title: member.title,
    description: member.description,
    icon: (
      <CardIcon icons={member.icons} packageName={member.name} version={member.version} size="l" />
    ),
    href: rewriteCardUrl(member, returnState).url,
    badge: member === recommended ? <RecommendedBadge /> : undefined,
    'data-test-subj': `collectionVariantRow-${member.id}`,
  }));
};

/** Chooser for the group id in the url. Uses Fleet's full card list so a curated tile still works with no search term. */
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
