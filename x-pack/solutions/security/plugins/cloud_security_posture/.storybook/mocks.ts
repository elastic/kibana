/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CspKibanaContext } from '../public/common/hooks/use_kibana';

export const useKibana = (): CspKibanaContext => {
  return {
    services: {
      cloud: {
        serverless: {},
        cloudId: 'fakeCloudId',
        onboarding: {},
      },
    },
  };
};

export const useIsSubscriptionStatusValid = () => {
  return { data: true, isLoading: false };
};

interface FleetStatus {
  isReady: () => boolean;
  isSecretsStorageEnabled: boolean;
}

export function useFleetStatus(): FleetStatus {
  return {
    isReady: true,
    isSecretsStorageEnabled: true,
  };
}

export const useStartServices = () => {
  return {
    docLinks: {
      links: {
        fleet: {
          policySecrets: 'https://www.elastic.co/guide/en/fleet/current/index.html',
        },
      },
    },
  };
};
