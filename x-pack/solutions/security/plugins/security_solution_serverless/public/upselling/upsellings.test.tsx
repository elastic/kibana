/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import { ProductFeatureKey } from '@kbn/security-solution-features/keys';

import { upsellingPages, upsellingSections } from './upsellings';
import { registerUpsellings } from './register_upsellings';
import { mockServices } from '../common/services/__mocks__/services.mock';
import { getEnabledProductFeatures } from '../../common/pli/pli_features';
import { ProductLine, ProductTier } from '../../common/product';
import type { SecurityProductTypes } from '../../common/config';

describe('upsellingPages', () => {
  it('registers the Attack discovery page with the Attack discovery PLI', () => {
    const attackDiscoveryPage = upsellingPages.find(
      ({ pageName }) => pageName === SecurityPageName.attackDiscovery
    );

    expect(attackDiscoveryPage?.pli).toEqual(ProductFeatureKey.attackDiscovery);
  });
});

describe('Cloud Defend integration upselling', () => {
  it.each([
    [ProductTier.essentials, false],
    [ProductTier.essentials, true],
    [ProductTier.complete, false],
    [ProductTier.complete, true],
  ] as const)(
    'gates Cloud Defend in %s with Cloud Protection enabled: %s',
    (tier, cloudEnabled) => {
      const productTypes: SecurityProductTypes = [
        { product_line: ProductLine.security, product_tier: tier },
        { product_line: ProductLine.endpoint, product_tier: tier },
      ];
      if (cloudEnabled) {
        productTypes.push({ product_line: ProductLine.cloud, product_tier: tier });
      }
      const upsell = upsellingSections.find(
        ({ id }) => id === 'cloud_defend_integration_installation'
      );
      expect(upsell).toBeDefined();
      expect(upsell?.pli).toBe(ProductFeatureKey.cloudDefend);
      if (upsell) {
        expect(getEnabledProductFeatures(productTypes).includes(upsell.pli)).toBe(cloudEnabled);
      }
    }
  );
});

describe('Endpoint policy upselling', () => {
  const securityEssentials = {
    product_line: ProductLine.security,
    product_tier: ProductTier.essentials,
  } as const;

  it.each([
    ['Security Essentials only', [securityEssentials], false, false],
    [
      'Security Essentials with Endpoint Essentials',
      [
        securityEssentials,
        { product_line: ProductLine.endpoint, product_tier: ProductTier.essentials },
      ],
      true,
      false,
    ],
    [
      'Security Essentials with Endpoint Complete',
      [
        securityEssentials,
        { product_line: ProductLine.endpoint, product_tier: ProductTier.complete },
      ],
      true,
      true,
    ],
  ] as const)(
    'gates policy protections and protection updates for %s',
    (_name, productTypes, protectionsEnabled, protectionUpdatesEnabled) => {
      const enabledProductFeatures = getEnabledProductFeatures([...productTypes]);
      const protectionsUpsell = upsellingSections.find(
        ({ id }) => id === 'endpointPolicyProtections'
      );
      const protectionUpdatesUpsell = upsellingSections.find(
        ({ id }) => id === 'endpoint_protection_updates'
      );

      expect(protectionsUpsell?.pli).toBe(ProductFeatureKey.endpointPolicyProtections);
      expect(protectionUpdatesUpsell?.pli).toBe(ProductFeatureKey.endpointProtectionUpdates);
      expect(enabledProductFeatures.includes(ProductFeatureKey.endpointPolicyProtections)).toBe(
        protectionsEnabled
      );
      expect(enabledProductFeatures.includes(ProductFeatureKey.endpointProtectionUpdates)).toBe(
        protectionUpdatesEnabled
      );
    }
  );

  it('renders the registered policy protections upsell for Security Essentials only', async () => {
    registerUpsellings([securityEssentials], mockServices);

    const ProtectionsUpsell = mockServices.securitySolution
      .getUpselling()
      .getSectionsValue()
      .get('endpointPolicyProtections');

    expect(ProtectionsUpsell).toBeDefined();
    if (!ProtectionsUpsell) {
      return;
    }

    render(
      <Suspense fallback={null}>
        <ProtectionsUpsell />
      </Suspense>
    );

    expect(await screen.findByTestId('endpointPolicy-protectionsLockedCard')).toBeInTheDocument();
  });
});
