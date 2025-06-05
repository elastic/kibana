/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  applyCategoryBadgeAndStyling,
  useEnhancedIntegrationCards,
  getCategoryBadgeIfAny,
} from './use_enhanced_integration_cards';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { installationStatuses } from '@kbn/fleet-plugin/public';
import { renderHook } from '@testing-library/react';

const mockCard = (name: string, categories?: string[]) =>
  ({
    id: `epr:${name}`,
    description: 'description',
    icons: [],
    title: name,
    url: `/app/integrations/detail/${name}-1.0.0/overview`,
    integration: '',
    name,
    version: '1.0.0',
    release: 'ga',
    categories: categories ?? [],
    isUnverified: false,
  } as IntegrationCardItem);

describe('applyCategoryBadgeAndStyling', () => {
  const mockInt = mockCard('crowdstrike', ['edr_xdr']);

  it('should add the specified return path', () => {
    const returnPath = `/my/custom/path`;
    const result = applyCategoryBadgeAndStyling(mockInt, { returnPath });

    const urlParams = new URLSearchParams(result.url.split('?')[1]);
    expect(urlParams.get('returnPath')).toBe(returnPath);
  });

  it('should add no return path details if not specified', () => {
    const result = applyCategoryBadgeAndStyling(mockInt);

    const urlParams = new URLSearchParams(result.url.split('?')[1]);
    expect(urlParams.get('returnPath')).toBeNull();
  });

  it('should add the EDR/XDR badge if the category includes edr_xdr', () => {
    const cardWithEdrXdr = { ...mockInt, categories: ['edr_xdr'] };
    const result = applyCategoryBadgeAndStyling(cardWithEdrXdr);

    expect(result.extraLabelsBadges).toHaveLength(1);
  });

  it('should add the SIEM badge if the category includes siem', () => {
    const cardWithSiem = { ...mockInt, categories: ['siem'] };
    const result = applyCategoryBadgeAndStyling(cardWithSiem);

    expect(result.extraLabelsBadges).toHaveLength(1);
  });

  it('should not add any badge if the category does not include edr_xdr or siem', () => {
    const cardWithOtherCategory = { ...mockInt, categories: ['other'] };
    const result = applyCategoryBadgeAndStyling(cardWithOtherCategory);

    expect(result.extraLabelsBadges).toHaveLength(0);
  });

  it('should set showDescription and showReleaseBadge to false', () => {
    const result = applyCategoryBadgeAndStyling(mockInt);

    expect(result.showDescription).toBe(false);
    expect(result.showReleaseBadge).toBe(false);
  });

  it('should set minCardHeight to 88', () => {
    const result = applyCategoryBadgeAndStyling(mockInt);

    expect(result.minCardHeight).toBe(88);
  });
});

describe('useEnhancedIntegrationCards', () => {
  const intA = mockCard('crowdstrike', ['edr_xdr']);
  const intB = mockCard('google_secops', ['siem']);
  const intC = mockCard('microsoft_sentinel', ['siem']);
  const intD = mockCard('sentinel_one', ['edr_xdr']);

  it('should return sorted available integrations with badges applied', () => {
    const mockIntegrationsList = [intA, intB, intC, intD];
    const { result } = renderHook(() => useEnhancedIntegrationCards(mockIntegrationsList));

    expect(result.current.available).toHaveLength(4);
    expect(result.current.available[0].id).toBe('epr:google_secops');
    expect(result.current.available[1].id).toBe('epr:microsoft_sentinel');
    expect(result.current.available[0].extraLabelsBadges).toHaveLength(1);
  });

  it('should return sorted installed integrations with badges applied', () => {
    const mockIntegrationsList = [
      intA,
      intB,
      { ...intC, installStatus: installationStatuses.Installed },
      intD,
    ];
    const { result } = renderHook(() => useEnhancedIntegrationCards(mockIntegrationsList));

    expect(result.current.installed).toHaveLength(1);
    expect(result.current.installed[0].id).toBe('epr:microsoft_sentinel');
    expect(result.current.installed[0].extraLabelsBadges).toHaveLength(1);
  });

  it('should handle an empty integrations list', () => {
    const { result } = renderHook(() => useEnhancedIntegrationCards([]));

    expect(result.current.available).toHaveLength(0);
    expect(result.current.installed).toHaveLength(0);
  });

  it('should correctly apply custom display order', () => {
    const mockIntegrationsList = [intA, intB, intC, intD];

    const shuffledList = [
      mockIntegrationsList[3],
      mockIntegrationsList[1],
      mockIntegrationsList[0],
      mockIntegrationsList[2],
    ];

    const { result } = renderHook(() => useEnhancedIntegrationCards(shuffledList));

    expect(result.current.available[0].id).toBe('epr:google_secops');
    expect(result.current.available[1].id).toBe('epr:microsoft_sentinel');
    expect(result.current.available[2].id).toBe('epr:sentinel_one');
    expect(result.current.available[3].id).toBe('epr:crowdstrike');
  });
});

describe('getCategoryBadgeIfAny', () => {
  it('should return "EDR/XDR" when the categories include "edr_xdr"', () => {
    const categories = ['edr_xdr', 'other_category'];
    const result = getCategoryBadgeIfAny(categories);
    expect(result).toBe('EDR/XDR');
  });

  it('should return "SIEM" when the categories include "siem"', () => {
    const categories = ['siem', 'other_category'];
    const result = getCategoryBadgeIfAny(categories);
    expect(result).toBe('SIEM');
  });

  it('should return "EDR/XDR" when both "edr_xdr" and "siem" are present', () => {
    const categories = ['edr_xdr', 'siem'];
    const result = getCategoryBadgeIfAny(categories);
    // "edr_xdr" takes precedence, but we don't realistically expect both to be present
    expect(result).toBe('EDR/XDR');
  });

  it('should return null when neither "edr_xdr" nor "siem" are present', () => {
    const categories = ['other_category'];
    const result = getCategoryBadgeIfAny(categories);
    expect(result).toBeNull();
  });

  it('should return null when the categories array is empty', () => {
    const categories: string[] = [];
    const result = getCategoryBadgeIfAny(categories);
    expect(result).toBeNull();
  });
});
