/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import {
  addPathParamToUrl,
  excludeContentCards,
  isFeaturedCard,
  RETURN_APP_ID,
  RETURN_PATH,
} from '.';
import { APP_UI_ID } from '../../../../common';

describe('addPathParamToUrl', () => {
  const encodedOnboardingLink = encodeURIComponent('/onboarding');
  it('should append query parameters to a URL without existing query parameters', () => {
    const url = 'https://example.com';
    const onboardingLink = '/onboarding';
    const result = addPathParamToUrl(url, onboardingLink);

    expect(result).toBe(
      `https://example.com?${RETURN_APP_ID}=${APP_UI_ID}&${RETURN_PATH}=${encodedOnboardingLink}`
    );
  });

  it('should append query parameters to a URL with existing query parameters', () => {
    const url = 'https://example.com?foo=bar';
    const onboardingLink = '/onboarding';
    const result = addPathParamToUrl(url, onboardingLink);

    expect(result).toBe(
      `https://example.com?foo=bar&${RETURN_APP_ID}=${APP_UI_ID}&${RETURN_PATH}=${encodedOnboardingLink}`
    );
  });

  it('should encode the onboarding link correctly', () => {
    const url = 'https://example.com';
    const onboardingLink = '/onboarding?step=1&next=2';
    const customEncodedOnboardingLink = encodeURIComponent(onboardingLink);
    const result = addPathParamToUrl(url, onboardingLink);

    expect(result).toBe(
      `https://example.com?${RETURN_APP_ID}=${APP_UI_ID}&${RETURN_PATH}=${customEncodedOnboardingLink}`
    );
  });
});

describe('excludeContentCards', () => {
  const card = (id: string, type?: string) => ({ id, type } as IntegrationCardItem);

  it('removes content-only packages and keeps everything else', () => {
    const cards = [
      card('integration', 'integration'),
      card('input', 'input'),
      card('content', 'content'),
      card('collection'), // collection cards have no type
    ];

    expect(excludeContentCards(cards).map(({ id }) => id)).toEqual([
      'integration',
      'input',
      'collection',
    ]);
  });
});

describe('isFeaturedCard', () => {
  const card = (id: string, extra: Partial<IntegrationCardItem> = {}) =>
    ({ id, ...extra } as IntegrationCardItem);
  const collection = card('collection:nginx', {
    isCollectionCard: true,
    groupMembers: [card('epr:nginx'), card('epr:nginx_otel')],
  });

  it('matches a card by its own id', () => {
    expect(isFeaturedCard(card('epr:endpoint'), ['epr:endpoint'])).toBe(true);
    expect(isFeaturedCard(card('epr:aws'), ['epr:endpoint'])).toBe(false);
  });

  it('matches a collection card when one of its members is featured', () => {
    expect(isFeaturedCard(collection, ['epr:nginx_otel'])).toBe(true);
    expect(isFeaturedCard(collection, ['collection:nginx'])).toBe(true);
    expect(isFeaturedCard(collection, ['epr:redis'])).toBe(false);
  });

  it('does not look at the members of a card that is not a collection', () => {
    const notCollection = card('epr:a', { groupMembers: [card('epr:b')] });

    expect(isFeaturedCard(notCollection, ['epr:b'])).toBe(false);
  });
});
