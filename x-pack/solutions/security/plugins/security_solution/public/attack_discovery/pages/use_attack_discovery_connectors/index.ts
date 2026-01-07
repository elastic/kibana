/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { ATTACK_DISCOVERY_CONNECTORS } from '@kbn/elastic-assistant-common';
import type { GetAttackDiscoveryConnectorsResponse } from '@kbn/elastic-assistant-common/impl/schemas/attack_discovery/routes/public/get/get_connectors.gen';
import { useQuery } from '@kbn/react-query';
import { useCallback } from 'react';

interface UseAttackDiscoveryConnectorsProps {
  http: HttpSetup;
}

export function useAttackDiscoveryConnectors({ http }: UseAttackDiscoveryConnectorsProps) {
  const queryFn = useCallback(
    () =>
      http.fetch<GetAttackDiscoveryConnectorsResponse>(ATTACK_DISCOVERY_CONNECTORS, {
        method: 'GET',
      }),
    [http]
  );

  return useQuery(['useAttackDiscoveryConnectors'], {
    queryFn,
  });
}
