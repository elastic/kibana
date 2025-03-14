/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductFeatureKeys } from '@kbn/security-solution-features';
import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import type { SecurityProductLine, SecurityProductTier } from '../config';
import { ProductLine } from '../product';

type PliProductFeatures = Readonly<
  Record<SecurityProductLine, Readonly<Record<SecurityProductTier, Readonly<ProductFeatureKeys>>>>
>;

export const PLI_PRODUCT_FEATURES: PliProductFeatures = {
  [ProductLine.aiSoc]: {
    search_ai_lake: [ProductFeatureKey.attackDiscovery, ProductFeatureKey.assistant],
    essentials: [ProductFeatureKey.attackDiscovery, ProductFeatureKey.assistant],
    complete: [ProductFeatureKey.attackDiscovery, ProductFeatureKey.assistant],
  },
  [ProductLine.security]: {
    search_ai_lake: [],
    essentials: [
      ProductFeatureKey.endpointHostManagement,
      ProductFeatureKey.endpointPolicyManagement,
    ],
    complete: [
      ProductFeatureKey.endpointHostManagement,
      ProductFeatureKey.endpointPolicyManagement,
      ProductFeatureKey.advancedInsights,
      ProductFeatureKey.assistant,
      ProductFeatureKey.attackDiscovery,
      ProductFeatureKey.investigationGuide,
      ProductFeatureKey.investigationGuideInteractions,
      ProductFeatureKey.threatIntelligence,
      ProductFeatureKey.casesConnectors,
      ProductFeatureKey.externalRuleActions,
      ProductFeatureKey.automaticImport,
      ProductFeatureKey.prebuiltRuleCustomization,
      ProductFeatureKey.siemMigrations,
    ],
  },
  [ProductLine.endpoint]: {
    search_ai_lake: [], // endpoint add-on not available in search_ai_lake tier
    essentials: [
      ProductFeatureKey.endpointPolicyProtections,
      ProductFeatureKey.endpointArtifactManagement,
      ProductFeatureKey.endpointExceptions,
    ],
    complete: [
      ProductFeatureKey.endpointPolicyProtections,
      ProductFeatureKey.endpointArtifactManagement,
      ProductFeatureKey.endpointExceptions,
      ProductFeatureKey.endpointHostIsolationExceptions,
      ProductFeatureKey.endpointResponseActions,
      ProductFeatureKey.osqueryAutomatedResponseActions,
      ProductFeatureKey.endpointAgentTamperProtection,
      ProductFeatureKey.endpointCustomNotification,
      ProductFeatureKey.endpointProtectionUpdates,
      ProductFeatureKey.securityWorkflowInsights,
    ],
  },
  [ProductLine.cloud]: {
    search_ai_lake: [], // cloud add-on not available in search_ai_lake tier
    essentials: [ProductFeatureKey.cloudSecurityPosture],
    complete: [ProductFeatureKey.cloudSecurityPosture],
  },
} as const;
