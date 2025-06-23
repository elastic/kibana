/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addPathParamToUrl, buildOnboardingPath } from './use_card_url_rewrite';

describe('useIntegratrionCardList', () => {
  describe('toOnboardingPath', () => {
    it('includes category in the URL', () => {
      expect(buildOnboardingPath({ category: 'logs' })).toBe('?category=logs');
    });
    it('includes search in the URL', () => {
      expect(buildOnboardingPath({ search: 'search' })).toBe('?search=search');
    });
    it('includes category and search in the URL', () => {
      expect(
        buildOnboardingPath({
          category: 'logs',
          search: 'search',
        })
      ).toBe('?category=logs&search=search');
    });
  });

  describe('addPathParamToUrl', () => {
    it('adds the onboarding link to url with existing params', () => {
      expect(
        addPathParamToUrl('/app/integrations?query-1', { search: 'aws', category: 'infra' })
      ).toBe(
        '/app/integrations?query-1&returnAppId=observabilityOnboarding&returnPath=%3Fcategory%3Dinfra%26search%3Daws'
      );
    });
    it('adds the onboarding link to url without existing params', () => {
      expect(addPathParamToUrl('/app/integrations', {})).toBe(
        '/app/integrations?returnAppId=observabilityOnboarding&returnPath=%3F'
      );
    });
  });
});
