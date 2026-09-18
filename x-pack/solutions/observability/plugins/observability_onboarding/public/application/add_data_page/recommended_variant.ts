/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';

const OPENTELEMETRY_CATEGORY = 'opentelemetry';

/** First installable OpenTelemetry member. Only `integration` and `input` collect data, so assets-only `content` packages never qualify. */
export const findRecommendedMember = (
  members: readonly IntegrationCardItem[]
): IntegrationCardItem | undefined =>
  members.find(
    (member) =>
      member.categories.includes(OPENTELEMETRY_CATEGORY) &&
      (member.type === 'integration' || member.type === 'input')
  );

/** Moves the recommended member to the front and keeps Fleet's order for the rest. */
export const orderMembers = (members: readonly IntegrationCardItem[]): IntegrationCardItem[] => {
  const recommended = findRecommendedMember(members);
  if (!recommended) return [...members];
  return [recommended, ...members.filter((member) => member !== recommended)];
};
