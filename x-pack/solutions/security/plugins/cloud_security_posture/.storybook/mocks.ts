/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface FleetStatus {
  isReady: () => boolean;
  isSecretsStorageEnabled: boolean;
}

export function useFleetStatus(): FleetStatus {
  return {
    isReady: () => true,
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
