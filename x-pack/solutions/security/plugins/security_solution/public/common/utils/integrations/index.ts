/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import queryString from 'query-string';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { APP_UI_ID } from '../../../../common';

export const RETURN_APP_ID = 'returnAppId';
export const RETURN_PATH = 'returnPath';

export const addPathParamToUrl = (
  url: string,
  onboardingLink: string,
  extraParams?: Record<string, string>
): string => {
  return queryString.stringifyUrl(
    {
      url,
      query: {
        [RETURN_APP_ID]: APP_UI_ID,
        [RETURN_PATH]: onboardingLink,
        ...extraParams,
      },
    },
    {
      encode: true,
      sort: false,
    }
  );
};

/**
 * Drops content-only packages (dashboards and assets without a data collection input), like the
 * Fleet Integrations page does by default. Collection cards have no `type` and are kept; their
 * members stay available in the chooser.
 */
export const excludeContentCards = (cards: IntegrationCardItem[]): IntegrationCardItem[] =>
  cards.filter((card) => card.type !== 'content');

/**
 * Whether a card is one of the featured cards. A collection card has its own id
 * (`collection:<group>`), so it is featured when any of its member packages is.
 */
export const isFeaturedCard = (card: IntegrationCardItem, featuredCardIds: string[]): boolean =>
  featuredCardIds.includes(card.id) ||
  (card.isCollectionCard === true &&
    (card.groupMembers ?? []).some((member) => featuredCardIds.includes(member.id)));
