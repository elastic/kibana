/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';

const AWS_CUSTOM_CARD_ID = 'aws-logs-virtual';
const FLEET_AWS_ONBOARDING_CARD_ID = 'epr:aws';

/**
 * With the ingest hub onboarding enabled, Fleet adds its own AWS tile that opens the same flow
 * and is searchable by service name. Keep that one and drop our custom AWS tile, so search
 * doesn't show two identical "Amazon Web Services" results.
 *
 * The `searchMembers` check tells Fleet's onboarding tile apart from a plain package card that
 * can share the `epr:aws` id when onboarding is off.
 */
export const withoutDuplicateAwsCard = (
  customCards: IntegrationCardItem[],
  fleetCards: IntegrationCardItem[]
): IntegrationCardItem[] => {
  const fleetHasAwsOnboardingCard = fleetCards.some(
    (card) => card.id === FLEET_AWS_ONBOARDING_CARD_ID && card.searchMembers !== undefined
  );
  return fleetHasAwsOnboardingCard
    ? customCards.filter((card) => card.id !== AWS_CUSTOM_CARD_ID)
    : customCards;
};
