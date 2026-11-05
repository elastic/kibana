/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { withoutDuplicateAwsCard } from './without_duplicate_aws_card';

const ALLOWED_CATEGORIES = ['observability', 'os_system'];

/**
 * The cards the Observability search offers: custom cards followed by Fleet's, limited to the
 * categories this flow shows and without the excluded ids.
 *
 * Custom and Fleet cards are filtered first and deduplicated afterwards, so the custom AWS card is
 * only dropped when Fleet's AWS tile is itself going to be shown.
 */
export const buildPackageList = ({
  customCards,
  fleetCards,
  excludePackageIdList,
}: {
  customCards: IntegrationCardItem[];
  fleetCards: IntegrationCardItem[];
  excludePackageIdList: string[];
}): IntegrationCardItem[] => {
  const isShown = (card: IntegrationCardItem) =>
    card.categories.some((category) => ALLOWED_CATEGORIES.includes(category)) &&
    !excludePackageIdList.includes(card.id);

  const shownFleetCards = fleetCards.filter(isShown);
  const shownCustomCards = customCards.filter(isShown);

  return withoutDuplicateAwsCard(shownCustomCards, shownFleetCards).concat(shownFleetCards);
};
