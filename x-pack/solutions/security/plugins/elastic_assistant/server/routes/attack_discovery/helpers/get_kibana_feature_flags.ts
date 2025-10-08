/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic   License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_PUBLIC_API_ENABLED_FEATURE_FLAG } from '@kbn/elastic-assistant-common';

import type { ElasticAssistantRequestHandlerContext } from '../../../types';

interface GetKibanaFeatureFlags {
  attackDiscoveryPublicApiEnabled: boolean;
}

export const getKibanaFeatureFlags = async (
  context: ElasticAssistantRequestHandlerContext
): Promise<GetKibanaFeatureFlags> => {
  const { featureFlags } = await context.core;

  const attackDiscoveryPublicApiEnabled = await featureFlags.getBooleanValue(
    ATTACK_DISCOVERY_PUBLIC_API_ENABLED_FEATURE_FLAG,
    false
  );

  return {
    attackDiscoveryPublicApiEnabled,
  };
};
